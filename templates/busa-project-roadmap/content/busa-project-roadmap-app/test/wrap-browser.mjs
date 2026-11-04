import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {sampleRecords} from '../app/js/demo-data.js';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const records=structuredClone(sampleRecords);
 records.projects[0].fields.title='Atlas December launch readiness';
 const names=[
  'Customer launch communications approved for all markets',
  'Support training completed for the December product launch',
  'Pricing and subscription terms approved for the launch',
  'Customer onboarding and account recovery verified',
 ];
 records.milestones.slice(0,names.length).forEach((r,i)=>r.fields.title=names[i]);
 await page.route('**/demo-data.js',r=>r.fulfill({contentType:'text/javascript',body:`export const sampleRecords = ${JSON.stringify(records)};`}));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.ROADMAP_PREVIEW_URL||'http://127.0.0.1:3108')+'/?demo=1');
 const handle=page.getByRole('separator',{name:'Resize project and milestone column'});await handle.waitFor();
 const label=page.locator('.row-label.child .text-button').filter({hasText:names[0]});
 const metrics=await label.evaluate(el=>({height:el.clientHeight,lineHeight:parseFloat(getComputedStyle(el).lineHeight),rowHeight:el.closest('.timeline-row').getBoundingClientRect().height,title:el.title}));
 assert.equal(metrics.height,metrics.lineHeight*2);
 assert.ok(metrics.rowHeight<=55,JSON.stringify(metrics));
 assert.equal(metrics.title,names[0]);
 assert.ok(await page.locator('.timeline-row').evaluateAll(rows=>rows.every(row=>{
  const label=row.querySelector('.row-label');const track=row.querySelector('.track');
  return !track||Math.abs(label.getBoundingClientRect().height-track.getBoundingClientRect().height)<1;
 })));
 await mkdir('coverage/wrapping',{recursive:true});
 await page.screenshot({path:'coverage/wrapping/default.png'});
 const box=await handle.boundingBox();await page.mouse.move(box.x+6,box.y+24);await page.mouse.down();await page.mouse.move(box.x+166,box.y+24,{steps:10});await page.mouse.up();
 assert.ok(await label.evaluate(el=>el.scrollHeight<=el.clientHeight));
 await page.screenshot({path:'coverage/wrapping/wide.png'});
 await handle.focus();await page.keyboard.press('Enter');
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.querySelector('.roadmap-divider').getAttribute('aria-valuenow')==='220');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.ok(await page.locator('.row-label .text-button').evaluateAll(items=>items.every(el=>el.clientHeight<=parseFloat(getComputedStyle(el).lineHeight)*2)));
 await page.screenshot({path:'coverage/wrapping/mobile.png'});
 await page.getByRole('button',{name:names[0],exact:true}).first().click();
 await page.getByRole('heading',{name:names[0],exact:true}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('Long names verified: two lines, 55px rows, aligned timeline, full tooltip/detail, wider column, mobile layout.');
} finally {await browser.close();}
