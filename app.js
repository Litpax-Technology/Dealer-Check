/* =====================================================================
   LITPAX DEALER AUTHORITY — app.js
   Tabs: PIN Check (auto-lookup) · Add Dealer · Edit Dealer (dropdown)
   ===================================================================== */
const GAS_URL = "https://script.google.com/macros/s/AKfycbzdh_LJi4QJK6WLJcZwAsbp2Qi9ZPsseoImYBYxuUauApHwYZu74DnVlu2j6nNZ_Fox6g/exec";

let DEALERS = [];
let lastCheckedPin = "";
let debounceTimer = null;

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const boxes = [...document.querySelectorAll('.pin-box')];
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('panel-' + t.dataset.tab).classList.add('active');
  });
});

/* ---------- toast ---------- */
let toastTimer;
function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.style.display = 'none', 2600);
}

/* ---------- load dealers (GET from GAS) ---------- */
async function loadDealers(showToast){
  if (!GAS_URL){
    $('srcTag').className = 'src-tag offline';
    $('srcTag').innerHTML = 'Data source: <b>Demo (GAS_URL set nahi hai)</b>';
    return;
  }
  try{
    const res = await fetch(GAS_URL);
    const d = await res.json();
    if (Array.isArray(d)){
      DEALERS = d;
      $('srcTag').className = 'src-tag';
      $('srcTag').innerHTML = 'Data source: <b>Google Sheet (live)</b> · ' + DEALERS.length + ' dealers';
      if (showToast) toast('Dealer list refresh ho gayi ✓');
    }
  }catch(e){
    $('srcTag').className = 'src-tag offline';
    $('srcTag').innerHTML = 'Data source: <b>Offline (Sheet load fail)</b>';
    if (showToast) toast('Sheet se load fail — internet/URL check karo');
  }
  populateEditDropdown();
}

/* =====================================================================
   ADD DEALER
   ===================================================================== */
$('saveBtn').addEventListener('click', async () => {
  const data = {
    state:     $('f_state').value.trim(),
    districts: $('f_districts').value.trim(),
    cities:    $('f_cities').value.trim(),
    dealer:    $('f_dealer').value.trim(),
    firm:      $('f_firm').value.trim(),
    city:      $('f_city').value.trim(),
    phone:     $('f_phone').value.trim(),
    type:      $('f_type').value,
    status:    $('f_status').value,
    since:     $('f_since').value
  };
  if (!data.state || !data.dealer){ toast('State aur Dealer name required hai'); return; }
  if (data.phone && !/^\d{10}$/.test(data.phone)){ toast('Phone 10 digit ka hona chahiye'); return; }
  if (!GAS_URL){ toast('Pehle GAS_URL set karo'); return; }

  $('saveBtn').disabled = true;
  $('saveBtn').textContent = 'Saving...';
  try{
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'add', data }) });
    const out = await res.json();
    if (out.ok){
      toast('Naya dealer add ho gaya ✓');
      ['f_state','f_districts','f_cities','f_dealer','f_firm','f_city','f_phone','f_since'].forEach(id => $(id).value = '');
      $('f_type').value = 'Dealer';
      $('f_status').value = 'Active';
      await loadDealers();
    } else {
      toast('Error: ' + (out.msg || 'save fail'));
    }
  }catch(e){
    toast('Network error — save fail ho gaya');
  }
  $('saveBtn').disabled = false;
  $('saveBtn').textContent = 'Save Dealer';
});

/* =====================================================================
   EDIT DEALER (dropdown → form → update / delete)
   ===================================================================== */
function populateEditDropdown(){
  const sel = $('editSelect');
  const current = sel.value;
  const sorted = [...DEALERS].sort((a,b) => a.state.localeCompare(b.state) || a.dealer.localeCompare(b.dealer));
  sel.innerHTML = '<option value="">— Select dealer —</option>' +
    sorted.map(m => {
      const terr = (m.cities && m.cities.length) ? m.cities.join(', ')
                 : (m.districts && m.districts.length) ? m.districts.join(', ')
                 : 'Poori state';
      return `<option value="${esc(m.id)}">${esc(m.state)} (${esc(terr)}) — ${esc(m.dealer)} · ${esc(m.type || 'Dealer')}</option>`;
    }).join('');
  // agar pehle se koi selected tha aur ab bhi list me hai to wapas select karo
  if (current && DEALERS.some(m => m.id === current)) sel.value = current;
  else { sel.value = ""; $('editForm').style.display = 'none'; }
}

$('editSelect').addEventListener('change', () => {
  const id = $('editSelect').value;
  if (!id){ $('editForm').style.display = 'none'; return; }
  const m = DEALERS.find(x => x.id === id);
  if (!m) return;
  $('e_state').value     = m.state;
  $('e_districts').value = m.districtsRaw !== undefined ? m.districtsRaw : (m.districts||[]).join(', ');
  $('e_cities').value    = m.citiesRaw !== undefined ? m.citiesRaw : (m.cities||[]).join(', ');
  $('e_dealer').value    = m.dealer;
  $('e_firm').value      = m.firm || '';
  $('e_city').value      = m.city || '';
  $('e_phone').value     = m.phone || '';
  $('e_type').value      = m.type || 'Dealer';
  $('e_status').value    = m.status || 'Active';
  $('e_since').value     = m.since || '';
  $('editForm').style.display = 'block';
});

$('updateBtn').addEventListener('click', async () => {
  const id = $('editSelect').value;
  if (!id){ toast('Pehle dealer select karo'); return; }
  const data = {
    state:     $('e_state').value.trim(),
    districts: $('e_districts').value.trim(),
    cities:    $('e_cities').value.trim(),
    dealer:    $('e_dealer').value.trim(),
    firm:      $('e_firm').value.trim(),
    city:      $('e_city').value.trim(),
    phone:     $('e_phone').value.trim(),
    type:      $('e_type').value,
    status:    $('e_status').value,
    since:     $('e_since').value
  };
  if (!data.state || !data.dealer){ toast('State aur Dealer name required hai'); return; }
  if (data.phone && !/^\d{10}$/.test(data.phone)){ toast('Phone 10 digit ka hona chahiye'); return; }

  $('updateBtn').disabled = true;
  $('updateBtn').textContent = 'Updating...';
  try{
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'update', id, data }) });
    const out = await res.json();
    if (out.ok){ toast('Dealer update ho gaya ✓'); await loadDealers(); }
    else toast('Error: ' + (out.msg || 'update fail'));
  }catch(e){ toast('Network error — update fail'); }
  $('updateBtn').disabled = false;
  $('updateBtn').textContent = 'Update Dealer';
});

$('deleteBtn').addEventListener('click', async () => {
  const id = $('editSelect').value;
  if (!id){ toast('Pehle dealer select karo'); return; }
  const m = DEALERS.find(x => x.id === id);
  if (!confirm((m ? m.dealer : id) + ' ko delete karna hai? Ye Sheet se bhi hat jayega.')) return;

  $('deleteBtn').disabled = true;
  try{
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'delete', id }) });
    const out = await res.json();
    if (out.ok){
      toast('Dealer delete ho gaya');
      $('editSelect').value = "";
      $('editForm').style.display = 'none';
      await loadDealers();
    } else toast('Error: ' + (out.msg || 'delete fail'));
  }catch(e){ toast('Network error — delete fail'); }
  $('deleteBtn').disabled = false;
});

$('refreshBtn').addEventListener('click', () => loadDealers(true));

/* =====================================================================
   PIN INPUT — AUTO LOOKUP (no button)
   ===================================================================== */
boxes.forEach((b, i) => {
  b.addEventListener('input', () => {
    b.value = b.value.replace(/\D/g,'').slice(0,1);
    b.classList.toggle('filled', !!b.value);
    if (b.value && i < 5) boxes[i+1].focus();
    onPinChange();
  });
  b.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !b.value && i > 0) boxes[i-1].focus();
  });
  b.addEventListener('paste', e => {
    e.preventDefault();
    const t = (e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,6);
    t.split('').forEach((ch, j) => { boxes[j].value = ch; boxes[j].classList.add('filled'); });
    boxes[Math.min(t.length,5)].focus();
    onPinChange();
  });
});

function pinValue(){ return boxes.map(b=>b.value).join(''); }

function onPinChange(){
  const pin = pinValue();
  $('clearBtn').classList.toggle('show', pin.length > 0);
  clearTimeout(debounceTimer);

  if (pin.length === 6){
    if (pin === lastCheckedPin) return;
    debounceTimer = setTimeout(() => doCheck(pin), 350);
  } else {
    lastCheckedPin = "";
    hideResult();
  }
}

$('clearBtn').addEventListener('click', () => {
  boxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
  lastCheckedPin = "";
  hideResult();
  $('clearBtn').classList.remove('show');
  boxes[0].focus();
});

function hideResult(){
  const r = $('resultWrap');
  r.classList.remove('show');
  r.style.display = 'none';
  r.innerHTML = '';
}

/* ---------- PIN lookup (India Post API) ---------- */
async function doCheck(pin){
  lastCheckedPin = pin;
  const result = $('resultWrap');
  result.style.display = 'block';
  result.classList.add('show');
  result.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';

  try{
    const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    if (pin !== pinValue()) return;

    if (!data[0] || data[0].Status !== "Success" || !data[0].PostOffice){
      renderError(`PIN <b>${pin}</b> ka koi record nahi mila. PIN check karke dobara try karo.`);
      return;
    }
    const poList = data[0].PostOffice;
    const po = poList[0];
    renderResult(pin, poList, po.District, po.State, findDealer(po.State, po.District, poList));
  }catch(err){
    renderError('Network error — PIN lookup fail ho gaya. Internet check karke dobara try karo.');
  }
}

/* =====================================================================
   3-LEVEL MATCHING (sabse specific pehle):
   1. City-level  : state + district + PIN ke areas me dealer ki koi city
   2. District    : state + district match, dealer ki cities BLANK ho
   3. State-level : state match, dealer ke districts BLANK ho
   ===================================================================== */
const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function findDealer(state, district, poList){
  const s = norm(state);
  const d = norm(district);
  // PIN ke matching tokens: area Name + Block + Taluk
  // (badi cities me PO name "Malviya Nagar" jaisa hota hai, lekin Block/Taluk me
  //  city ka naam hota hai — e.g. Jaipur city POs me Block = "Jaipur")
  const areaNames = [];
  (poList || []).forEach(p => {
    ['Name','Block','Taluk'].forEach(k => {
      const v = norm(p[k]);
      if (v && v !== 'na') areaNames.push(v);
    });
  });

  const stateMatch = x => norm(x.state) === s;
  const distMatch  = x => Array.isArray(x.districts) && x.districts.length &&
                          x.districts.some(dd => norm(dd) === d);
  const hasCities  = x => Array.isArray(x.cities) && x.cities.length > 0;

  // Level 1: city-level dealer — PIN ke kisi area name me dealer ki city match ho
  let m = DEALERS.find(x =>
    stateMatch(x) && distMatch(x) && hasCities(x) &&
    x.cities.some(c => {
      const nc = norm(c);
      return nc && areaNames.some(a => a === nc || a.includes(nc) || nc.includes(a));
    })
  );
  if (m) return m;

  // Level 2: district-level dealer (cities blank waala hi)
  m = DEALERS.find(x => stateMatch(x) && distMatch(x) && !hasCities(x));
  if (m) return m;

  // Level 3: state-level dealer (districts blank)
  m = DEALERS.find(x => stateMatch(x) && (!x.districts || x.districts.length === 0));
  return m || null;
}

/* ---------- result render ---------- */
function locStrip(pin, district, state, count){
  return `
  <div class="loc-strip">
    <div class="loc-chip"><span class="lbl">PIN</span><b>${esc(pin)}</b></div>
    <div class="loc-chip"><span class="lbl">District</span><b>${esc(district)}</b></div>
    <div class="loc-chip"><span class="lbl">State</span><b>${esc(state)}</b></div>
    <div class="loc-chip"><span class="lbl">Areas</span><b>${count}</b></div>
  </div>`;
}

function areaCard(poList){
  const pills = poList.map(p => `<span class="area-pill">${esc(p.Name)}</span>`).join('');
  return `
  <div class="dealer-card info">
    <span class="badge info">Is PIN ke areas</span>
    <div class="areas-flow">${pills}</div>
  </div>`;
}

function renderResult(pin, poList, district, state, m){
  const result = $('resultWrap');
  const head = locStrip(pin, district, state, poList.length) + areaCard(poList);
  if (m){
    const isDealer  = (m.type || '').trim().toLowerCase() === 'dealer';
    const isActive  = (m.status || '').toLowerCase() === 'active';
    const canOrder  = isDealer && isActive;
    const orderStrip = canOrder
      ? `<div class="order-strip allowed">✅ ACTIVE — Sales team yahan order le sakti hai</div>`
      : `<div class="order-strip blocked">🚫 DEACTIVATED — Sales team yahan order <b>nahi</b> le sakti${!isDealer ? ' (' + esc(m.type) + ' territory)' : ' (partner ' + esc(m.status) + ' hai)'}</div>`;

    result.innerHTML = head + `
    <div class="dealer-card ${canOrder ? '' : 'none'}">
      <span class="badge ${canOrder ? 'ok' : 'warn'}">${esc(m.type || 'Dealer')} · ${esc(m.status || 'Active')}</span>
      <h3>${esc(m.dealer)}</h3>
      <div class="firm">${esc(m.firm || '')}${m.city ? ' · ' + esc(m.city) : ''}</div>
      ${orderStrip}
      <div class="grid">
        <div class="item"><div class="k">Territory</div><div class="v">${(m.cities && m.cities.length) ? esc(m.cities.join(', ')) + ' (' + esc(m.districts.join(', ')) + ')' : (m.districts && m.districts.length) ? esc(m.districts.join(', ')) + ' (poora district)' : esc(state) + ' (poori state)'}</div></div>
        <div class="item"><div class="k">Agreement Since</div><div class="v">${esc(m.since || '—')}</div></div>
      </div>
      ${m.phone ? `<a class="call-btn" href="tel:${esc(m.phone)}">📞 ${esc(m.phone)}</a>` : ''}
    </div>`;
  } else {
    result.innerHTML = head + `
    <div class="dealer-card">
      <span class="badge ok">Open Territory</span>
      <h3>Koi partner assigned nahi</h3>
      <div class="firm">${esc(district)}, ${esc(state)} me abhi koi Dealer/Distributor/C&F nahi hai.</div>
      <div class="order-strip allowed">✅ ACTIVE — Sales team yahan direct order le sakti hai</div>
    </div>`;
  }
}

function renderError(msg){
  $('resultWrap').innerHTML = `
  <div class="dealer-card error">
    <span class="badge err">Error</span>
    <h3>Lookup fail</h3>
    <div class="note">${msg}</div>
  </div>`;
}

/* ---------- init ---------- */
loadDealers();
boxes[0].focus();
