import fs from 'fs';
import sharp from 'sharp';
import { assemblePages } from '../src/lib/print/layout';

async function main(){
  const buf = await sharp({create:{width:600,height:400,channels:3,background:{r:200,g:100,b:100}}}).png().toBuffer();
  const pages = await assemblePages([buf,buf,buf,buf,buf,buf,buf,buf],{dpi:300,cols:1,rows:8,marginMm:5,spacingMm:0.1});
  console.log('pages', pages.length);
  fs.writeFileSync('test_pages_1x8.png', pages[0]);
  console.log('wrote test_pages_1x8.png');
}

main().catch(e=>{console.error(e); process.exit(1)})
