"""Check the actual exported SVG/PNG images, not just their source manifest."""
from pathlib import Path
import json
import re
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
from PIL import Image, ImageFont

BASE = Path(__file__).resolve().parents[1] / 'diagrams'
schema = json.loads((BASE / 'sources/schema-snapshot.json').read_text(encoding='utf-8'))
manifest = json.loads((BASE / 'sources/chen-relational-manifest.json').read_text(encoding='utf-8'))
NS = {'s': 'http://www.w3.org/2000/svg'}
checks = []
primary = {k['table_name']: k['columns'] for k in schema['keys'] if k['kind'] == 'p'}
fk_by_name = {f['name']: f for f in schema['relationships']}
font_regular = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
font_italic = ImageFont.truetype('C:/Windows/Fonts/ariali.ttf', 16)

def segments(path):
    parts = re.findall(r'[MVH]|-?\d+(?:\.\d+)?', path)
    i, point, result = 0, None, []
    while i < len(parts):
        command = parts[i]
        i += 1
        if command == 'M':
            point = (float(parts[i]), float(parts[i+1]))
            i += 2
        else:
            value = float(parts[i])
            i += 1
            new = (value, point[1]) if command == 'H' else (point[0], value)
            result.append((point, new))
            point = new
    return result

def crosses_inside(segment, box):
    (x1, y1), (x2, y2) = segment
    x, y, w, h = box
    epsilon = 0.01
    if x1 == x2:
        return x + epsilon < x1 < x+w-epsilon and max(min(y1,y2), y)+epsilon < min(max(y1,y2), y+h)
    return y + epsilon < y1 < y+h-epsilon and max(min(x1,x2), x)+epsilon < min(max(x1,x2), x+w)

for image in manifest['images']:
    svg_path = BASE / (image['stem'] + '.svg')
    png_path = BASE / (image['stem'] + '.png')
    tree = ET.parse(svg_path)
    root = tree.getroot()
    with Image.open(png_path) as png:
        assert png.size == (image['pngWidth'], image['pngHeight']), image['stem']
        png.verify()
    if image['kind'] == 'chen':
        groups = {}
        for group in root.findall('.//s:g[@class="node"]', NS):
            title = group.find('s:title', NS)
            groups[title.text] = group
        for table in image['tables'] + image['externalTables']:
            assert groups['ent_' + table].find('s:polygon', NS) is not None, table
        for attribute in image['attributes']:
            group = groups[attribute['id']]
            assert group.find('s:ellipse', NS) is not None, attribute
            labels = group.findall('s:text', NS)
            assert ''.join(t.text or '' for t in labels) == attribute['column'], attribute
            underlined = any('underline' in t.get('text-decoration', '') for t in labels)
            assert underlined == (attribute['column'] in primary[attribute['table']]), attribute
        by_id = {el.get('id'): el for el in root.iter() if el.get('id')}
        for name in image['foreignKeys']:
            relationship = fk_by_name[name]
            assert groups['rel_' + name].find('s:polygon', NS) is not None, name
            parent_edge = by_id[name + '_parent']
            child_edge = by_id[name + '_child']
            assert [t.text for t in parent_edge.findall('s:text', NS)] == ['1'], name
            assert [t.text for t in child_edge.findall('s:text', NS)] == ['1' if relationship['unique_child'] else 'N'], name
            assert len(child_edge.findall('s:path', NS)) == (1 if relationship['nullable'] else 2), name
        if image['complete']:
            assert len([key for key in groups if key.startswith('ent_')]) == 43
            assert len([key for key in groups if key.startswith('attr_')]) == 374
            assert len([key for key in groups if key.startswith('rel_')]) == 67
        checks.append({'image': image['stem'], 'passed': True, 'checked': 'entity rectangles, attribute ovals, PK underlining, relationship diamonds, cardinality labels, required/optional participation lines, PNG validity'})
    else:
        children = list(root)
        rects = {el.get('id'): (i, el) for i, el in enumerate(children) if el.tag.endswith('rect') and (el.get('id') or '').startswith('cell_')}
        assert len(rects) == len(image['fields']), image['stem']
        boxes = []
        underlined = 0
        for field in image['fields']:
            cell_id = 'cell_' + field['table'] + '_' + field['column']
            index, rect = rects[cell_id]
            label = children[index+1]
            assert label.tag.endswith('text') and label.text == field['column'], field
            assert (label.get('text-decoration') == 'underline') == (field['column'] in primary[field['table']]), field
            underlined += label.get('text-decoration') == 'underline'
            fk = next((f for f in schema['relationships'] if f['child'] == field['table'] and field['column'] in f['child_columns']), None)
            assert (label.get('font-style') == 'italic') == bool(fk), field
            font = font_italic if fk else font_regular
            assert font.getlength(field['column']) <= float(rect.get('width')) - 10, field
            boxes.append(tuple(float(rect.get(k)) for k in ('x','y','width','height')))
        assert underlined == len(image['tables']) + len(image['externalTables']), image['stem']
        paths = {el.get('id')[3:]: el for el in root.findall('s:path', NS) if (el.get('id') or '').startswith('fk_')}
        assert set(paths) == set(image['foreignKeys']), image['stem']
        for arrow in image['arrows']:
            real = fk_by_name[arrow['name']]
            assert arrow['source'] == {'table':real['child'], 'column':real['child_columns'][0]}
            assert arrow['target'] == {'table':real['parent'], 'column':real['parent_columns'][0]}
            path = paths[arrow['name']]
            assert path.get('d') == arrow['path'], arrow['name']
            route = segments(path.get('d'))
            end_x, end_y = route[-1][1]
            _, target = rects['cell_' + real['parent'] + '_' + real['parent_columns'][0]]
            assert float(target.get('x')) < end_x < float(target.get('x')) + float(target.get('width'))
            assert abs(end_y - (float(target.get('y')) - 1)) < 0.01
            for segment in route:
                assert not any(crosses_inside(segment, box) for box in boxes), arrow['name'] + ' crosses an attribute cell'
        if image['complete']:
            assert len(rects) == 441 and len(paths) == 67 and underlined == 43
        checks.append({'image':image['stem'], 'passed':True, 'checked':'exact cell labels, actual PK underlining, FK styling and endpoints, text fit, arrow paths outside attribute cells, PNG validity'})

# Also verify the current crow's-foot and table-box images kept alongside Chen.
crow_manifest = json.loads((BASE / 'sources/render-manifest.json').read_text(encoding='utf-8'))
assert crow_manifest['schemaHash'] == schema['schemaHash']
for image in crow_manifest['images']:
    root = ET.parse(BASE / (image['stem'] + '.svg')).getroot()
    with Image.open(BASE / (image['stem'] + '.png')) as png:
        assert png.size == (image['pngWidth'], image['pngHeight']), image['stem']
        png.verify()
    nodes = {group.find('s:title', NS).text: group for group in root.findall('.//s:g[@class="node"]', NS)}
    assert set(nodes) == set(image['tables'] + image['externalTables']), image['stem']
    edges = {group.get('id'): group for group in root.findall('.//s:g[@class="edge"]', NS)}
    assert set(edges) == set(image['foreignKeys']), image['stem']
    dot_path = BASE / 'sources' / (image['stem'].replace('/', '_') + '.dot')
    dot_lines = dot_path.read_text(encoding='utf-8').splitlines()
    for name in image['foreignKeys']:
        fk = fk_by_name[name]
        texts = [t.text for t in edges[name].findall('s:text', NS)]
        expected = fk['child_columns'] + [fk['parent_per_child'], '0..1' if fk['unique_child'] else '0..N']
        assert sorted(texts) == sorted(expected), (image['stem'], name, texts)
        dot_line = next(line for line in dot_lines if f'id="{name}"' in line)
        assert f'arrowhead="{"teeodot" if fk["unique_child"] else "crowodot"}"' in dot_line, name
        assert f'arrowtail="{"teeodot" if fk["nullable"] else "teetee"}"' in dot_line, name
    if image['mode'] == 'schema':
        for table in image['tables']:
            labels = [t.text for t in nodes[table].findall('s:text', NS)]
            for column in schema['columns']:
                if column['table_name'] == table:
                    assert column['column_name'] in labels, (image['stem'], table, column['column_name'])
    checks.append({'image':image['stem'], 'passed':True, 'checked':'current crow-foot/table-box entities, actual FK endpoints and cardinalities, DOT markers, schema attribute labels and PNG validity'})

report = {'verifiedAt':datetime.now(timezone.utc).isoformat(), 'passed':len(checks), 'failed':0, 'checks':checks}
(BASE / 'sources/asset-verification.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(f"PASS {len(checks)}/{len(checks)} exported image pairs: shapes, labels, PK/FK mapping, cardinalities, participation, text fit, PNG decoding and non-obstructing schema arrows.")
