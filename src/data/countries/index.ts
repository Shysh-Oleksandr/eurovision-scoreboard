/*
From https://eurovisionworld.com/eurovision/2022
Script for getting countries from the table:
Array.from(document.querySelectorAll(".v_table tbody tr")).map(tr => {
  return tr.querySelectorAll("td")[1]?.querySelector("a")?.textContent.trim();
}).filter(Boolean);
*/

/* 
Script for getting GF odds from the table:
Array.from(document.querySelectorAll('.v_table tbody tr'))
  .map((tr) => {
    const tds = tr.querySelectorAll('td');
    const name = tds[1]?.querySelector('a')?.textContent?.trim();
    const televoteText = tds[4]?.querySelector('div')?.textContent?.trim();
    const juryText = tds[5]?.textContent?.trim();
    
    const juryPoints = juryText ? parseInt(juryText, 10) : null;
    const televotePoints = televoteText ? parseInt(televoteText, 10) : null;

    return name && juryPoints !== null && televotePoints !== null
      ? { name, juryPoints, televotePoints }
      : null;
  })
  .filter(Boolean);

  ------------------------------------------------------------
  
Script for getting SF odds from the table:

Array.from(document.querySelectorAll('.v_table.v_table_out tbody tr'))
.map((tr) => {
  const tds = tr.querySelectorAll('td');
  const name = tds[1]?.querySelector('a')?.textContent?.trim();
  const pointsText = tds[3]?.textContent?.trim();
  
  const points = pointsText ? parseInt(pointsText, 10) : null;

  return name && points !== null
    ? { name, points }
    : null;
})
.filter(Boolean);
*/

/*
From https://en.wikipedia.org/wiki/Eurovision_Song_Contest_2025#Spokespersons
Script for getting spokesperson order from the list:
Array.from(document.querySelectorAll(".div-col ol li")).map((item, index) => {
  const text = item.textContent.trim();
  const name = text.split("–")[0].trim(); // get the part before the en dash
  return {
    name,
    order: index
  };
});
*/

export const RestOfWorld = {
  name: 'Rest of the World',
  code: 'WW',
  category: 'Rest of Europe',
}
