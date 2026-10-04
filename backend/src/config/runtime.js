import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function configureRuntime(config) {
  if (config.NODE_ENV === 'production') {
    if (config.JWT_SECRET.length < 32) throw new Error('JWT_SECRET is required.');
    return config;
  }
  await mkdir(resolve('.data'), { recursive: true });
  async function secretFile(name) {
    const path=resolve('.data',name);
    try { return (await readFile(path,'utf8')).trim(); }
    catch(error) {
      if(error.code!=='ENOENT') throw error;
      const value=randomBytes(48).toString('hex');
      await writeFile(path,value,{mode:0o600});
      return value;
    }
  }
  return {
    ...config,
    JWT_SECRET: config.JWT_SECRET.length>=32 ? config.JWT_SECRET : await secretFile('local-secret'),
    AGENT_SERVICE_TOKEN: config.AGENT_SERVICE_TOKEN || await secretFile('local-agent-secret'),
  };
}
