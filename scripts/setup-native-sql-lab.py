"""Provision the dedicated local SQL Lab cluster, never the school cluster."""
import json, os, re, secrets, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
local = root / '.local'
runtime = local / 'postgresql16/bin'
data = local / 'postgres-lab-data'
config = local / 'sql-lab.json'
if not config.exists():
    config.write_text(json.dumps({'user':'meridian_lab_admin','password':secrets.token_hex(24)}))
cfg = json.loads(config.read_text())
pw = local / 'sql-lab-password.txt'
pw.write_text(cfg['password'])
if not (data / 'PG_VERSION').exists():
    subprocess.run([str(runtime/'initdb.exe'),'-D',str(data),'-U',cfg['user'],'--pwfile='+str(pw),'--auth=scram-sha-256','--encoding=UTF8','--locale=C'],check=True)
    with (data/'postgresql.conf').open('a') as f:
        f.write("\nlisten_addresses = '127.0.0.1'\nport = 5433\ncluster_name = 'meridian-sql-lab'\nmax_connections = 30\nshared_buffers = '64MB'\n")
    (data/'pg_hba.conf').write_text("host all meridian_lab_admin 127.0.0.1/32 scram-sha-256\nhost sameuser all 127.0.0.1/32 scram-sha-256\nhost all all 0.0.0.0/0 reject\nhost all all ::0/0 reject\n")
status=subprocess.run([str(runtime/'pg_ctl.exe'),'-D',str(data),'status'],capture_output=True)
if status.returncode:
    subprocess.run([str(runtime/'pg_ctl.exe'),'-D',str(data),'-l',str(local/'postgres-lab.log'),'-w','start'],check=True)
url=f"postgresql://{cfg['user']}:{cfg['password']}@127.0.0.1:5433/postgres"
subprocess.run(['node',str(root/'server/sql-lab/provision.mjs')],cwd=root,env=dict(os.environ,SQL_LAB_ADMIN_URL=url),check=True)
env_path=root/'server/.env'
text=env_path.read_text()
line='SQL_LAB_ADMIN_URL='+url
text=re.sub(r'^SQL_LAB_ADMIN_URL=.*$',lambda _:line,text,flags=re.M) if re.search(r'^SQL_LAB_ADMIN_URL=',text,re.M) else text+'\n'+line+'\n'
env_path.write_text(text)
docker_env=root/'.env'
docker_text=docker_env.read_text() if docker_env.exists() else ''
if not re.search(r'^SQL_LAB_POSTGRES_PASSWORD=',docker_text,re.M):
    docker_env.write_text(docker_text+'\nSQL_LAB_POSTGRES_PASSWORD='+cfg['password']+'\n')
print('Dedicated native SQL Lab cluster and fictional template ready on 127.0.0.1:5433')
