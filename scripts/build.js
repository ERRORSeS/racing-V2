import {mkdir,cp,rm,writeFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true}); await mkdir('dist');
for(const p of ['index.html','src']) await cp(p,`dist/${p}`,{recursive:true});

await writeFile('dist/.nojekyll','');
