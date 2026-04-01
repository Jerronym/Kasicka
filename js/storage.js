// Kasička — localStorage, sync, cloud, import/export
const LS_KEY='kasicka_v1';

function saveToStorage(){
  try{
    localStorage.setItem(LS_KEY,JSON.stringify(buildExportPayload()));
    if(syncFileHandle){
      writeSyncFile();
    } else {
      const ind=document.getElementById('save-indicator');
      ind.textContent='✓ Uloženo';
      ind.style.display='block';
      clearTimeout(ind._t);
      ind._t=setTimeout(()=>ind.style.display='none',2000);
    }
  }catch(e){
    console.warn('Chyba při ukládání do localStorage:',e.message);
    toast('Nepodařilo se uložit data lokálně. Úložiště může být plné.','error');
  }
}

const DEMO_DATA={"_version": 1, "_exported": "2026-03-22T12:00:00.000Z", "transactions": [{"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-01-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 1850, "date": "2025-01-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland velký nákup", "tags": [], "amount": 1240, "date": "2025-01-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-01-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata leden", "tags": [], "amount": 42500, "date": "2025-01-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 380, "date": "2025-01-10", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-01-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Restaurace s přáteli", "tags": ["sociální"], "amount": 720, "date": "2025-01-13", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz donáška", "tags": [], "amount": 890, "date": "2025-01-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Hokejbal trénink", "tags": [], "amount": 300, "date": "2025-01-15", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 12000, "date": "2025-01-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 450, "date": "2025-01-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-01-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-01-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Gym doplňky stravy", "tags": [], "amount": 680, "date": "2025-01-22", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Billa", "tags": [], "amount": 520, "date": "2025-01-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kino", "tags": [], "amount": 290, "date": "2025-01-26", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lékárna", "tags": [], "amount": 340, "date": "2025-01-28", "type": "vydaj", "cat": "ZDRAVÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 5000, "date": "2025-01-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 5000, "toCur": "CZK"}, {"desc": "Pivo s kamarády", "tags": ["sociální"], "amount": 480, "date": "2025-01-30", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-02-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 1850, "date": "2025-02-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1100, "date": "2025-02-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-02-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata únor", "tags": [], "amount": 42500, "date": "2025-02-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 420, "date": "2025-02-10", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-02-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Valentýn — večeře", "tags": ["sociální", "výjimečné"], "amount": 1200, "date": "2025-02-14", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 750, "date": "2025-02-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-02-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 490, "date": "2025-02-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-02-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-02-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Nové běžecké boty Nike", "tags": [], "amount": 2890, "date": "2025-02-22", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Billa", "tags": [], "amount": 580, "date": "2025-02-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lékař", "tags": [], "amount": 200, "date": "2025-02-27", "type": "vydaj", "cat": "ZDRAVÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 5000, "date": "2025-02-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 5000, "toCur": "CZK"}, {"desc": "BTC nákup", "tags": ["investice"], "amount": 15000, "date": "2025-03-01", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-03-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 1850, "date": "2025-03-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1350, "date": "2025-03-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-03-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata březen", "tags": [], "amount": 42500, "date": "2025-03-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-03-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 820, "date": "2025-03-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-03-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 410, "date": "2025-03-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-03-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-03-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výlet na kole — ubytování", "tags": ["výlet"], "amount": 1800, "date": "2025-03-22", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 650, "date": "2025-03-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lékárna vitamíny", "tags": [], "amount": 390, "date": "2025-03-28", "type": "vydaj", "cat": "ZDRAVÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 5000, "date": "2025-03-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 5000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-04-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 1850, "date": "2025-04-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 980, "date": "2025-04-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-04-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata duben", "tags": [], "amount": 42500, "date": "2025-04-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-04-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Oblečení Reserved", "tags": [], "amount": 1450, "date": "2025-04-14", "type": "vydaj", "cat": "OBLEČENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 760, "date": "2025-04-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-04-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 520, "date": "2025-04-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-04-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-04-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Pivo s kamarády", "tags": ["sociální"], "amount": 560, "date": "2025-04-23", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 430, "date": "2025-04-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Hokejbal výbava", "tags": [], "amount": 890, "date": "2025-04-27", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 5000, "date": "2025-04-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 5000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-05-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 1850, "date": "2025-05-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1150, "date": "2025-05-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-05-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata květen", "tags": [], "amount": 42500, "date": "2025-05-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-05-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 890, "date": "2025-05-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-05-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Letní festival vstupenka", "tags": ["výjimečné"], "amount": 1200, "date": "2025-05-17", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 480, "date": "2025-05-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-05-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-05-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Restaurace", "tags": ["sociální"], "amount": 680, "date": "2025-05-22", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 510, "date": "2025-05-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Zubař", "tags": [], "amount": 800, "date": "2025-05-28", "type": "vydaj", "cat": "ZDRAVÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 5000, "date": "2025-05-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 5000, "toCur": "CZK"}, {"desc": "AAPL akcie nákup", "tags": ["investice"], "amount": 8500, "date": "2025-06-01", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-06-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 1850, "date": "2025-06-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1080, "date": "2025-06-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-06-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata červen", "tags": [], "amount": 42500, "date": "2025-06-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-06-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-06-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 720, "date": "2025-06-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 440, "date": "2025-06-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-06-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-06-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Nové tričko Decathlon", "tags": [], "amount": 390, "date": "2025-06-22", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 460, "date": "2025-06-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Týdenní dovolená Chorvatsko", "tags": ["dovolená", "výjimečné"], "amount": 12500, "date": "2025-06-27", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 3000, "date": "2025-06-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 3000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-07-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 1850, "date": "2025-07-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1200, "date": "2025-07-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-07-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata červenec", "tags": [], "amount": 42500, "date": "2025-07-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-07-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 840, "date": "2025-07-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-07-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 510, "date": "2025-07-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-07-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-07-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Grilování — potraviny", "tags": ["sociální"], "amount": 890, "date": "2025-07-22", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 480, "date": "2025-07-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Cyklistická helma nová", "tags": [], "amount": 1290, "date": "2025-07-28", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 5000, "date": "2025-07-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 5000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-08-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 1850, "date": "2025-08-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1100, "date": "2025-08-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-08-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata srpen", "tags": [], "amount": 42500, "date": "2025-08-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-08-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 780, "date": "2025-08-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-08-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 430, "date": "2025-08-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-08-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-08-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Narozeninová večeře", "tags": ["sociální", "výjimečné"], "amount": 1500, "date": "2025-08-22", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 500, "date": "2025-08-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Vitamíny + suplementy", "tags": [], "amount": 750, "date": "2025-08-27", "type": "vydaj", "cat": "ZDRAVÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 5000, "date": "2025-08-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 5000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-09-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 1850, "date": "2025-09-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1050, "date": "2025-09-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-09-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata září", "tags": [], "amount": 44000, "date": "2025-09-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-09-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 810, "date": "2025-09-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-09-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 470, "date": "2025-09-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-09-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-09-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Zimní bunda", "tags": [], "amount": 3200, "date": "2025-09-22", "type": "vydaj", "cat": "OBLEČENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 490, "date": "2025-09-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lékárna", "tags": [], "amount": 280, "date": "2025-09-28", "type": "vydaj", "cat": "ZDRAVÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 6000, "date": "2025-09-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 6000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-10-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 2100, "date": "2025-10-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1180, "date": "2025-10-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-10-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata říjen", "tags": [], "amount": 44000, "date": "2025-10-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-10-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 870, "date": "2025-10-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-10-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 520, "date": "2025-10-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-10-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-10-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Fotbal — permanentka", "tags": ["výjimečné"], "amount": 2500, "date": "2025-10-23", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 550, "date": "2025-10-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kino a pivo", "tags": ["sociální"], "amount": 480, "date": "2025-10-27", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 6000, "date": "2025-10-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 6000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-11-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 2100, "date": "2025-11-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1240, "date": "2025-11-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-11-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata listopad", "tags": [], "amount": 44000, "date": "2025-11-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-11-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 930, "date": "2025-11-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-11-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 540, "date": "2025-11-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-11-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-11-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Black Friday — elektronika", "tags": ["výjimečné"], "amount": 4200, "date": "2025-11-25", "type": "vydaj", "cat": "OSTATNÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 580, "date": "2025-11-26", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Vitamíny na zimu", "tags": [], "amount": 420, "date": "2025-11-28", "type": "vydaj", "cat": "ZDRAVÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 6000, "date": "2025-11-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 6000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2025-12-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 2100, "date": "2025-12-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland — vánoční nákup", "tags": [], "amount": 2800, "date": "2025-12-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2025-12-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata prosinec + bonus", "tags": [], "amount": 58000, "date": "2025-12-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2025-12-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2025-12-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Vánoční dárky", "tags": ["vánoce", "výjimečné"], "amount": 5500, "date": "2025-12-15", "type": "vydaj", "cat": "OSTATNÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 680, "date": "2025-12-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2025-12-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2025-12-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Silvestr — přípravy", "tags": ["sociální", "vánoce"], "amount": 1200, "date": "2025-12-22", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rodinná večeře potraviny", "tags": ["vánoce"], "amount": 890, "date": "2025-12-24", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výlet na hory — ubytování", "tags": ["výjimečné", "výlet"], "amount": 3800, "date": "2025-12-26", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Roční spoření bonus", "tags": [], "amount": 10000, "date": "2025-12-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 10000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2026-01-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 2100, "date": "2026-01-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1100, "date": "2026-01-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2026-01-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata leden", "tags": [], "amount": 44000, "date": "2026-01-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2026-01-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 820, "date": "2026-01-14", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2026-01-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 490, "date": "2026-01-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2026-01-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2026-01-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Běžecká soutěž startovné", "tags": [], "amount": 400, "date": "2026-01-22", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 510, "date": "2026-01-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lékárna", "tags": [], "amount": 290, "date": "2026-01-28", "type": "vydaj", "cat": "ZDRAVÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 6000, "date": "2026-01-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 6000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2026-02-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 2100, "date": "2026-02-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1050, "date": "2026-02-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2026-02-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata únor", "tags": [], "amount": 44000, "date": "2026-02-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2026-02-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Valentýn — večeře", "tags": ["sociální"], "amount": 1350, "date": "2026-02-14", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 770, "date": "2026-02-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2026-02-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 460, "date": "2026-02-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2026-02-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2026-02-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Squash s kamarádem", "tags": ["sociální"], "amount": 280, "date": "2026-02-22", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 490, "date": "2026-02-25", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Vitamíny", "tags": [], "amount": 350, "date": "2026-02-27", "type": "vydaj", "cat": "ZDRAVÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Měsíční spoření", "tags": [], "amount": 6000, "date": "2026-02-28", "type": "prevod", "cat": "Převod", "cur": "CZK", "accIdx": "0", "toAccIdx": "1", "convertedAmount": 6000, "toCur": "CZK"}, {"desc": "Nájem", "tags": ["fixní"], "amount": 14500, "date": "2026-03-02", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Energie + internet", "tags": ["fixní"], "amount": 2100, "date": "2026-03-03", "type": "vydaj", "cat": "BYDLENÍ", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Kaufland", "tags": [], "amount": 1150, "date": "2026-03-05", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Multisport karta", "tags": ["fixní"], "amount": 850, "date": "2026-03-08", "type": "vydaj", "cat": "SPORT", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Výplata březen", "tags": [], "amount": 44000, "date": "2026-03-10", "type": "prijem", "cat": "MZDA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Lidl", "tags": [], "amount": 430, "date": "2026-03-10", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "MHD měsíční", "tags": ["fixní"], "amount": 550, "date": "2026-03-12", "type": "vydaj", "cat": "DOPRAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Rohlík.cz", "tags": [], "amount": 800, "date": "2026-03-15", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Investice → VWCE", "tags": ["investice"], "amount": 6000, "date": "2026-03-15", "type": "vydaj", "cat": "INVESTICE", "cur": "CZK", "accIdx": "0", "invIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Albert", "tags": [], "amount": 480, "date": "2026-03-18", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Spotify", "tags": ["fixní"], "amount": 189, "date": "2026-03-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Netflix", "tags": ["fixní"], "amount": 329, "date": "2026-03-20", "type": "vydaj", "cat": "ZÁBAVA", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}, {"desc": "Restaurace oběd", "tags": [], "amount": 380, "date": "2026-03-22", "type": "vydaj", "cat": "JÍDLO", "cur": "CZK", "accIdx": "0", "toAccIdx": null, "convertedAmount": null, "toCur": null}], "accounts": [{"name": "Sporožiro KB", "balance": 28450.0, "currency": "CZK", "type": "bank", "includeInTotal": true, "startDate": "2025-01-01"}, {"name": "Spořicí účet", "balance": 52300.0, "currency": "CZK", "type": "savings", "includeInTotal": true, "startDate": "2025-01-01"}, {"name": "Hotovost", "balance": 1850.0, "currency": "CZK", "type": "cash", "includeInTotal": true, "startDate": "2025-01-01"}, {"name": "Kreditní karta", "balance": -3200.0, "currency": "CZK", "type": "card", "includeInTotal": false, "startDate": "2025-01-01"}], "investments": [{"ticker": "VWCE", "type": "ETF", "invested": 96000.0, "value": 103200.0, "startDate": "2025-01-15", "history": [{"date": "2025-01-15", "value": 12000.0, "prevValue": 12000.0, "note": "Počáteční vklad"}, {"date": "2025-04-01", "value": 31800.0, "prevValue": 12000.0, "note": "Q1 2025 — investováno 30 000"}, {"date": "2025-07-01", "value": 51200.0, "prevValue": 31800.0, "note": "Q2 2025 — investováno 48 000"}, {"date": "2025-10-01", "value": 71500.0, "prevValue": 51200.0, "note": "Q3 2025 — investováno 66 000"}, {"date": "2026-01-01", "value": 90800.0, "prevValue": 71500.0, "note": "Konec 2025 — investováno 84 000"}, {"date": "2026-03-01", "value": 103200.0, "prevValue": 90800.0, "note": "Únor 2026 — investováno 96 000"}]}, {"ticker": "BTC", "type": "Krypto", "invested": 15000.0, "value": 22400.0, "startDate": "2025-03-01", "history": [{"date": "2025-03-01", "value": 15000.0, "prevValue": 15000.0, "note": "Nákup"}, {"date": "2025-07-01", "value": 13200.0, "prevValue": 15000.0, "note": "Korekce trhu"}, {"date": "2025-10-01", "value": 18900.0, "prevValue": 13200.0, "note": "Oživení"}, {"date": "2026-01-01", "value": 21000.0, "prevValue": 18900.0, "note": "Konec 2025"}, {"date": "2026-03-01", "value": 22400.0, "prevValue": 21000.0, "note": "Únor 2026"}]}, {"ticker": "AAPL", "type": "Akcie", "invested": 8500.0, "value": 9100.0, "startDate": "2025-06-01", "history": [{"date": "2025-06-01", "value": 8500.0, "prevValue": 8500.0, "note": "Nákup"}, {"date": "2025-10-01", "value": 8200.0, "prevValue": 8500.0, "note": "Lehký pokles"}, {"date": "2026-01-01", "value": 8900.0, "prevValue": 8200.0, "note": "Konec 2025"}, {"date": "2026-03-01", "value": 9100.0, "prevValue": 8900.0, "note": "Únor 2026"}]}], "budgets": [{"name": "Jídlo", "limit": 6000, "color": "#fbbf24", "budType": "periodic", "period": "month", "cats": ["JÍDLO"], "trackMode": "cats", "trackTags": []}, {"name": "Sport", "limit": 2000, "color": "#2dd4bf", "budType": "periodic", "period": "month", "cats": ["SPORT"], "trackMode": "cats", "trackTags": []}, {"name": "Zábava", "limit": 1500, "color": "#a78bfa", "budType": "periodic", "period": "month", "cats": ["ZÁBAVA"], "trackMode": "cats", "trackTags": []}, {"name": "Fixní výdaje", "limit": 20000, "color": "#4f8ef7", "budType": "periodic", "period": "month", "cats": [], "trackMode": "tags", "trackTags": ["fixní"]}, {"name": "Investice celkem", "limit": 100000, "color": "#34d399", "budType": "cumulative", "period": "month", "cats": ["INVESTICE"], "trackMode": "cats", "trackTags": []}], "categories": [{"name": "JÍDLO", "color": "#fbbf24", "icon": "🍽️"}, {"name": "BYDLENÍ", "color": "#4f8ef7", "icon": "🏠"}, {"name": "DOPRAVA", "color": "#4f8ef7", "icon": "🚗"}, {"name": "ZÁBAVA", "color": "#a78bfa", "icon": "🎬"}, {"name": "ZDRAVÍ", "color": "#34d399", "icon": "❤️"}, {"name": "OBLEČENÍ", "color": "#a78bfa", "icon": "👕"}, {"name": "SPOŘENÍ", "color": "#34d399", "icon": "💰"}, {"name": "INVESTICE", "color": "#4f8ef7", "icon": "📈"}, {"name": "MZDA", "color": "#34d399", "icon": "💼"}, {"name": "SPORT", "color": "#2dd4bf", "icon": "🏋️"}, {"name": "OSTATNÍ", "color": "#8b92a8", "icon": "📦"}], "balanceHistory": [], "invHistory": []};

function loadFromStorage(){
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(!raw){applyImport({});return;}
    applyImport(JSON.parse(raw));
  }catch(e){
    console.warn('Chyba při načítání dat z localStorage:',e.message);
    toast('Nepodařilo se načíst uložená data.','warn');
    applyImport({});
  }
}



// ── File System Access API (OneDrive auto-sync) ────────────
let syncFileHandle=null;

async function connectSyncFolder(){
  if(!('showSaveFilePicker' in window)){
    toast('Tvůj prohlížeč nepodporuje přímý přístup k souborům.\nPoužij Chrome nebo Edge na počítači.','warn');
    return;
  }
  try{
    syncFileHandle=await window.showSaveFilePicker({
      suggestedName:'kasicka-data.json',
      types:[{description:'JSON soubor',accept:{'application/json':['.json']}}],
      startIn:'downloads'
    });
    localStorage.setItem('kasicka_sync_hint','connected');
    updateSyncBtn(true);
    await writeSyncFile();
  }catch(e){
    if(e.name!=='AbortError') toast('Nepodařilo se propojit soubor: '+e.message,'error');
  }
}

function updateSyncBtn(connected){
  const lbl=document.getElementById('sync-folder-label');
  const btn=document.getElementById('btn-sync-folder');
  if(connected){
    lbl.textContent='☁ Synchronizováno';
    btn.style.color='var(--green)';
  } else {
    lbl.textContent='Propojit OneDrive';
    btn.style.color='';
  }
}

async function writeSyncFile(){
  if(!syncFileHandle) return;
  try{
    const data=JSON.stringify(buildExportPayload(),null,2);
    const writable=await syncFileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    const ind=document.getElementById('save-indicator');
    ind.textContent='✓ Uloženo do souboru';
    ind.style.display='block';
    clearTimeout(ind._t);
    ind._t=setTimeout(()=>{ind.style.display='none';ind.textContent='✓ Uloženo';},2500);
  }catch(e){
    if(e.name==='NotAllowedError'){
      syncFileHandle=null;
      updateSyncBtn(false);
    }
  }
}


// ── Verze dat a migrace ────────────────────────────────────
const DATA_VERSION=5;

function buildExportPayload(){
  return {
    _version: DATA_VERSION,
    _exported: new Date().toISOString(),
    transactions: transactions.map(t=>({
      desc:       t.desc||'',
      tags:       Array.isArray(t.tags)?t.tags:(t.tag?[t.tag]:[]),
      amount:     t.amount||0,
      date:       t.date||today(),
      type:       t.type||'vydaj',
      cat:        t.cat||'OSTATNÍ',
      cur:        t.cur||'CZK',
      accIdx:     t.accIdx||'',
      toAccIdx:   t.toAccIdx||null,
      convertedAmount: t.convertedAmount||null,
      toCur:      t.toCur||null,
      invIdx:     t.invIdx!=null?String(t.invIdx):null,
      sharedGroupId: t.sharedGroupId||null,
      sharedTxnId: t.sharedTxnId||null,
      recurring: t.recurring||null,
      recurringGenerated: t.recurringGenerated||null,
    })),
    accounts: accounts.map(a=>({
      name:           a.name||'',
      initialBalance: a.initialBalance||0,
      currency:       a.currency||'CZK',
      type:           a.type||'bank',
      includeInTotal: a.includeInTotal!==false,
      startDate:      a.startDate||'',
    })),
    investments: investments.map(i=>({
      ticker:        i.ticker||'',
      apiSymbol:     i.apiSymbol||'',
      shares:        i.shares||null,
      lastPrice:     i.lastPrice||null,
      lastPriceDate: i.lastPriceDate||null,
      type:          i.type||'Akcie',
      invested:      i.invested||0,
      value:         i.value||0,
      startDate:     i.startDate||'',
      history:       i.history||[],
      groupIdx:      i.groupIdx,
      accIdx:        i.accIdx||'',
    })),
    budgets: budgets.map(b=>({
      name:      b.name||'',
      limit:     b.limit||0,
      color:     b.color||'#4f8ef7',
      budType:   b.budType||'periodic',
      period:    b.period||'month',
      cats:      b.cats||[],
      trackMode: b.trackMode||'cats',
      trackTags: b.trackTags||[],
      flowMode:  b.flowMode||'vydaj',
    })),
    categories: categories.map(c=>({
      name:  c.name||'',
      color: c.color||'#8b92a8',
      icon:  c.icon||'📦',
    })),
    balanceHistory: balanceHistory,
    invHistory:     invHistory,
    invGroups:      invGroups.map(g=>({name:g.name||'',color:g.color||'#a78bfa',note:g.note||''})),
  };
}

function migrateImport(d){
  const v=d._version||0;
  // v0 → v1: tag (string) → tags (array), přidej categories pokud chybí
  if(v<1){
    (d.transactions||[]).forEach(t=>{
      if(!t.tags) t.tags=t.tag?[t.tag]:[];
      delete t.tag;
    });
    if(!d.categories) d.categories=[];
  }
  // v1 → v2: balance → initialBalance (odvozené ze součtu transakcí)
  if(v<2){
    const txns=d.transactions||[];
    (d.accounts||[]).forEach((a,i)=>{
      if(a.initialBalance===undefined){
        const impact=txns.reduce((s,t)=>s+txnImpact(t,i),0);
        a.initialBalance=(a.balance||0)-impact;
      }
    });
  }
  // v2 → v3: accountLinks → profiles + groups, linkIdx → groupIdx
  if(v<3){
    const links=d.accountLinks||[];
    const profMap=new Map();
    const newProfiles=[];
    links.forEach(l=>{
      [l.accIdx1,l.accIdx2].forEach(ai=>{
        if(!profMap.has(ai)){
          const acc=(d.accounts||[])[ai];
          const name=acc?acc.name:'Profil '+(newProfiles.length+1);
          profMap.set(ai,newProfiles.length);
          newProfiles.push({name,icon:'👤'});
        }
      });
    });
    (d.accounts||[]).forEach((a,i)=>{
      if(profMap.has(i)) a.profileIdx=profMap.get(i);
    });
    const newGroups=links.map(l=>({
      name:l.name||'',
      profileIdxs:[profMap.get(l.accIdx1),profMap.get(l.accIdx2)].filter(p=>p!=null),
      categories:l.categories||[]
    }));
    (d.transactions||[]).forEach(t=>{
      if(t.linkIdx!=null){
        t.groupIdx=t.linkIdx;
        delete t.linkIdx;
      }
    });
    d.profiles=newProfiles;
    d.groups=newGroups;
    delete d.accountLinks;
  }
  // v3 → v4: sdílení přesunuto do Supabase, vyčistíme lokální data
  if(v<4){
    (d.accounts||[]).forEach(a=>{ delete a.profileIdx; });
    (d.transactions||[]).forEach(t=>{ delete t.groupIdx; delete t.linkIdx; });
    delete d.profiles;
    delete d.groups;
    delete d.accountLinks;
  }
  // v4 → v5: recurringRules (legacy, nyní recurring je vlastnost transakce)
  if(v<5){
    // Migrace starých recurringRules na transakce s recurring polem
    if(d.recurringRules&&d.recurringRules.length){
      d.recurringRules.forEach(r=>{
        if(!r.name||!r.nextDate) return;
        (d.transactions=d.transactions||[]).push({
          desc:r.name, tags:r.tags||[], amount:r.amount||0,
          date:r.nextDate, type:r.type||'vydaj', cat:r.cat||'OSTATNÍ',
          cur:r.cur||'CZK', accIdx:r.accIdx||'',
          recurring:{interval:r.interval||'monthly',nextDate:r.nextDate,endDate:r.endDate||'',enabled:r.enabled!==false}
        });
      });
    }
    delete d.recurringRules;
  }
  return d;
}

function applyImport(d){
  d=migrateImport(d);
  transactions=  (d.transactions||[]).map(t=>({...t, tags:Array.isArray(t.tags)?t.tags:[]}));
  accounts=      (d.accounts||[]).map(a=>({name:'',initialBalance:0,currency:'CZK',type:'bank',...a}));
  investments=   (d.investments||[]).map(i=>({ticker:'',type:'Akcie',invested:0,value:0,history:[],...i}));
  invGroups=     (d.invGroups||[]).map(g=>({name:'',color:'#a78bfa',note:'',...g}));
  budgets=       (d.budgets||[]).map(b=>({name:'',limit:0,color:'#4f8ef7',...b}));
  categories=    (d.categories||[]).map(c=>({name:'',color:'#8b92a8',icon:'📦',...c}));
  balanceHistory=d.balanceHistory||[];
  invHistory=    d.invHistory||[];
}

// ── Export / Import JSON ───────────────────────────────────
function exportData(){
  const data=JSON.stringify(buildExportPayload(),null,2);
  const blob=new Blob([data],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download='kasicka-zaloha-'+new Date().toISOString().split('T')[0]+'.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(ev){
  const file=ev.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const d=JSON.parse(e.target.result);
      if(!confirm('Importovat data? Aktuální data budou nahrazena.')) return;
      applyImport(d);
      saveToStorage();
      initCategories();
      refreshCatSelect();
      markDirty();
      toast('Data úspěšně importována!'+(d._version<DATA_VERSION?' (migrace ze starší verze proběhla automaticky)':''),'success');
    }catch(e){toast('Chyba při čtení souboru: '+e.message,'error');}
  };
  reader.readAsText(file);
  ev.target.value='';
}

async function loadFromSyncFile(){
  if(!('showOpenFilePicker' in window)){
    toast('Tvůj prohlížeč nepodporuje přímý přístup k souborům.\nPoužij Chrome nebo Edge.','warn');
    return;
  }
  try{
    const [handle]=await window.showOpenFilePicker({
      types:[{description:'JSON soubor',accept:{'application/json':['.json']}}]
    });
    syncFileHandle=handle;
    const file=await handle.getFile();
    const text=await file.text();
    const d=JSON.parse(text);
    applyImport(d);
    saveToStorage();
    initCategories();
    refreshCatSelect();
    markDirty();
    updateSyncBtn(true);
    toast('Data načtena a propojení aktivováno!','success');
  }catch(e){
    if(e.name!=='AbortError') toast('Nepodařilo se načíst soubor: '+e.message,'error');
  }
}

