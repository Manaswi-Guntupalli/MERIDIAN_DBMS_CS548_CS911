// Optional: regenerate genuine MiniLM fixtures. Requires the initial model download.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(new URL('../../../server/package.json', import.meta.url));
const { env, pipeline } = await import('@huggingface/transformers');
const config = require('dotenv').parse(readFileSync(resolve(root, 'server/.env')));
env.cacheDir = resolve(root, 'server', config.EMBEDDING_CACHE_DIR || 'storage/model-cache');
const model = 'Xenova/all-MiniLM-L6-v2';
const encoder = await pipeline('feature-extraction', model, { dtype: 'fp32' });
const items = [
  { key: 'absence', title: 'Reporting student absence', category: 'POLICY', content: 'If a student misses school, a parent must inform the class teacher before the first period and submit an absence note when the student returns.' },
  { key: 'fees', title: 'Fee payment deadlines', category: 'POLICY', content: 'Term tuition fees must be paid before the published due date. Parents can check the outstanding balance and payment receipts in the Fees portal.' },
  { key: 'library', title: 'Library borrowing rules', category: 'POLICY', content: 'Students may borrow two library books for fourteen days. Renew books with the librarian and return borrowed items on time for other readers.' },
  { key: 'emergency', title: 'Emergency assembly instructions', category: 'NOTICE', content: 'During an evacuation, follow the teacher to the designated assembly point. Walk calmly, leave bags behind, and wait for the class attendance check.' },
  { key: 'timetable', title: 'Published timetable changes', category: 'NOTICE', content: 'Students should check the published timetable each morning. A substitute teacher or room change will appear after the school office publishes the updated schedule.' },
  { key: 'lab', title: 'Science laboratory safety', category: 'DOCUMENT', content: 'Wear safety goggles during experiments, follow the laboratory teacher instructions, and report spills or broken equipment immediately. Never taste chemicals.' },
];
async function embed(text) {
  const output = await encoder(text, { pooling: 'mean', normalize: true, truncation: true });
  const values = Array.from(output.data);
  if (values.length !== 384 || values.some(x => !Number.isFinite(x))) throw new Error('Invalid MiniLM embedding');
  return values;
}
for (const item of items) item.embedding = await embed(item.title + '\n' + item.content);
const query = { text: 'What should I do when my child misses class?', embedding: await embed('What should I do when my child misses class?') };
const updated = { title: 'Reporting student absence', content: 'Parents must notify the class teacher before the first period when a child is absent. On returning to school, the student must bring a signed absence note.' };
updated.embedding = await embed(updated.title + '\n' + updated.content);
const target = resolve(root, 'database/rubric/fixtures/knowledge-embeddings.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ model, dimensions: 384, pooling: 'mean', normalized: true, generatedAt: new Date().toISOString(), items, query, updated }, null, 2) + '\n');
console.log(`Generated ${items.length + 2} genuine ${model} embeddings (384 dimensions).`);
