import {mkdir,cp,rm,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=(await readdir('src')).sort(),hash=createHash('sha256');
for(const file of files)hash.update(file).update(await readFile(`src/${file}`));
const html=await readFile('index.html','utf8');hash.update(html);
const release=hash.digest('hex').slice(0,12),assetBase=`assets/${release}`;
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await cp('src',`dist/${assetBase}`,{recursive:true});
// Retain legacy URLs for already-open older clients; new clients use versioned modules.
await cp('src','dist/src',{recursive:true});
await writeFile('dist/index.html',html.replace('href="src/style.css"',`href="${assetBase}/style.css"`).replace('src="src/app.js"',`src="${assetBase}/app.js"`));
await writeFile('dist/release.json',JSON.stringify({release,assetBase}));await writeFile('dist/.nojekyll','');
console.log(`Built release ${release}; modules and worker use immutable release URLs.`);
