const url = 'https://xn--ur0ap3x.help/js/index-DV13ybfm.js';
fetch(url).then(res => res.text()).then(t => {
  // Find API endpoints
  const apiRe = /https?:\\\/\\\/[^"'\]*api[^"'\]*/gi;
  const m = t.match(apiRe) || [];
  const unique = [...new Set(m)];
  console.log('=== API Endpoints ===');
  unique.forEach(u => console.log(u));

  // Find getclass references
  const gcRe = /getclass[^"'\]*/gi;
  const g = t.match(gcRe) || [];
  console.log('\n=== getclass refs ===');
  [...new Set(g)].forEach(u => console.log(u));

  // Find price/amount references
  const priceRe = /(price|amount|money|salePrice|sellingPrice)[^"'\,;]*/gi;
  const p = t.match(priceRe) || [];
  console.log('\n=== price refs ===');
  [...new Set(p)].slice(0, 30).forEach(u => console.log(u));
}).catch(e => console.error(e.message));
