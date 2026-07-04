/* =====================================================================
   LITPAX DEALER AUTHORITY — app.js
   CONFIG — GAS Web App URL yahan paste karo (Deploy ke baad /exec wala)
   ===================================================================== */
const GAS_URL = "";   // <-- e.g. "https://script.google.com/macros/s/AKfyc...../exec"

/* Fallback demo data (GAS_URL blank ho ya fetch fail ho to) */
let DEALERS = [
  { id:"DLR-1001", state:"Haryana", districts:[], districtsRaw:"", dealer:"Rajesh Kumar", firm:"RK Battery House", city:"Rohtak", phone:"9876500001", type:"Exclusive State", status:"Active", since:"2025-04-01" },
  { id:"DLR-1002", state:"Punjab", districts:["Ludhiana","Moga"], districtsRaw:"Ludhiana, Moga", dealer:"Harpreet Singh", firm:"HS Power Solutions", city:"Ludhiana", phone:"9876500002", type:"District", status:"Active", since:"2025-06-15" }
];
let ONLINE = false;
let EDIT_ID = null;

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
    ONLINE = false;
    $('srcTag').className = 'src-tag offline';
    $('srcTag').innerHTML = 'Data source: <b>Demo (GAS_URL set nahi hai)</b>';
    renderDealerList();
    return;
  }
  try{
    const res = await fetch(GAS_URL);
    const d = await res.json();
    if (Array.isArray(d)){
      DEALERS = d;
      ONLINE = true;
      $('srcTag').className = 'src-tag';
      $('srcTag').innerHTML = 'Data source: <b>Google Sheet (live)</b> · ' + DEALERS.length + ' dealers';
      if (showToast) toast('Dealer list refresh ho gayi ✓');
    }
  }catch(e){
    ONLINE = false;
    $('srcTag').className = 'src-tag offline';
    $('srcTag').innerHTML = 'Data source: <b>Offline (Sheet load fail)</b>';
    if (showToast) toast('Sheet se load fail — internet/URL check karo');
  }
  renderDealerList();
}

/* ---------- save (add / update — POST to GAS) ---------- */
$('saveBtn').addEventListener('click', async () => {
  const data = {
    state:     $('f_state').value.trim(),
    districts: $('f_districts').value.trim(),
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
  if (!GAS_URL){ toast('Pehle GAS_URL set karo — abhi save nahi hoga'); return; }

  $('saveBtn').disabled = true;
  $('saveBtn').textContent = 'Saving...';
  try{
    const payload = EDIT_ID
      ? { action:'update', id: EDIT_ID, data }
      : { action:'add', data };
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify(payload) });
    const out = await res.json();
    if (out.ok){
      toast(EDIT_ID ? 'Dealer update ho gaya ✓' : 'Naya dealer add ho gaya ✓');
      resetForm();
      await loadDealers();
    } else {
      toast('Error: ' + (out.msg || 'save fail'));
    }
  }catch(e){
    toast('Network error — save fail ho gaya');
  }
  $('saveBtn').disabled = false;
  $('saveBtn').textContent = EDIT_ID ? 'Update Dealer' : 'Save Dealer';
});

/* ---------- edit ---------- */
function startEdit(id){
  const m = DEALERS.find(x => x.id === id);
  if (!m) return;
  EDIT_ID = id;
  $('f_state').value     = m.state;
  $('f_districts').value = m.districtsRaw !== undefined ? m.districtsRaw : (m.districts||[]).join(', ');
  $('f_dealer').value    = m.dealer;
  $('f_firm').value      = m.firm || '';
  $('f_city').value      = m.city || '';
  $('f_phone').value     = m.phone || '';
  $('f_type').value      = m.type || 'District';
  $('f_status').value    = m.status || 'Active';
  $('f_since').value     = m.since || '';
  $('formTitle').textContent = 'Dealer edit karo — ' + m.id;
  $('saveBtn').textContent = 'Update Dealer';
  $('cancelEditBtn').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$('cancelEditBtn').addEventListener('click', resetForm);

function resetForm(){
  EDIT_ID = null;
  ['f_state','f_districts','f_dealer','f_firm','f_city','f_phone','f_since'].forEach(id => $(id).value = '');
  $('f_type').value = 'District';
  $('f_status').value = 'Active';
  $('formTitle').textContent = 'Naya dealer add karo';
  $('saveBtn').textContent = 'Save Dealer';
  $('cancelEditBtn').style.display = 'none';
}

/* ---------- delete ---------- */
async function delDealer(id, name){
  if (!GAS_URL){ toast('Pehle GAS_URL set karo'); return; }
  if (!confirm(name + ' ko delete karna hai? Ye Sheet se bhi hat jayega.')) return;
  try{
    const res = await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'delete', id }) });
    const out = await res.json();
    if (out.ok){ toast('Dealer delete ho gaya'); await loadDealers(); }
    else toast('Error: ' + (out.msg || 'delete fail'));
  }catch(e){ toast('Network error — delete fail'); }
}

/* ---------- dealer list render ---------- */
function renderDealerList(){
  const wrap = $('dealerList');
  $('dCount').textContent = '(' + DEALERS.length + ')';
  if (!DEALERS.length){
    wrap.innerHTML = '<div class="drow"><div class="meta">Abhi koi dealer nahi hai — upar form se pehla dealer add karo.</div></div>';
    return;
  }
  const sorted = [...DEALERS].sort((a,b) => a.state.localeCompare(b.state));
  wrap.innerHTML = sorted.map(m => {
    const terr = (m.districts && m.districts.length) ? m.districts.join(', ') : 'Poori state (Exclusive)';
    const sttCls = m.status === 'Active' ? 'Active' : (m.status === 'Inactive' ? 'Inactive' : 'UA');
    return `
    <div class="drow">
      <div class="top">
        <div>
          <div class="nm">${esc(m.dealer)} <span class="stt ${sttCls}">${esc(m.status)}</span></div>
          <div class="meta">${esc(m.firm || '—')}${m.city ? ' · ' + esc(m.city) : ''}${m.phone ? ' · 📞 ' + esc(m.phone) : ''}${m.since ? ' · since ' + esc(m.since) : ''}</div>
          <div class="terr"><b>${esc(m.state)}</b> → ${esc(terr)}</div>
        </div>
        <div class="acts">
          <button class="ico-btn" onclick="startEdit('${m.id}')">Edit</button>
          <button class="ico-btn del" onclick="delDealer('${m.id}','${esc(m.dealer)}')">Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

$('refreshBtn').addEventListener('click', () => loadDealers(true));

/* ---------- PIN input UX (OTP style) ---------- */
boxes.forEach((b, i) => {
  b.addEventListener('input', () => {
    b.value = b.value.replace(/\D/g,'').slice(0,1);
    b.classList.toggle('filled', !!b.value);
    if (b.value && i < 5) boxes[i+1].focus();
    syncBtn();
  });
  b.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !b.value && i > 0) boxes[i-1].focus();
    if (e.key === 'Enter' && !$('checkBtn').disabled) doCheck();
  });
  b.addEventListener('paste', e => {
    e.preventDefault();
    const t = (e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,6);
    t.split('').forEach((ch, j) => { boxes[j].value = ch; boxes[j].classList.add('filled'); });
    boxes[Math.min(t.length,5)].focus();
    syncBtn();
  });
});
function pinValue(){ return boxes.map(b=>b.value).join(''); }
function syncBtn(){ $('checkBtn').disabled = pinValue().length !== 6; }
$('checkBtn').addEventListener('click', doCheck);

/* ---------- PIN lookup (India Post API) ---------- */
async function doCheck(){
  const pin = pinValue();
  const result = $('resultWrap');
  result.style.display = 'block';
  result.innerHTML = '<div class="spinner" role="status" aria-label="Loading"></div>';

  try{
    const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    if (!data[0] || data[0].Status !== "Success" || !data[0].PostOffice){
      renderError(`PIN <b>${pin}</b> ka koi record nahi mila. PIN check karke dobara try karo.`);
      return;
    }
    const po = data[0].PostOffice[0];
    renderResult(pin, po.Name, po.District, po.State, findDealer(po.State, po.District));
  }catch(err){
    renderError('Network error — PIN lookup fail ho gaya. Internet check karke dobara try karo.');
  }
}

/* ---------- matching: district pehle, phir state ---------- */
function findDealer(state, district){
  const s = state.trim().toLowerCase();
  const d = district.trim().toLowerCase();
  let m = DEALERS.find(x =>
    x.state.trim().toLowerCase() === s &&
    Array.isArray(x.districts) && x.districts.length &&
    x.districts.some(dd => dd.trim().toLowerCase() === d)
  );
  if (m) return m;
  m = DEALERS.find(x =>
    x.state.trim().toLowerCase() === s &&
    (!x.districts || x.districts.length === 0)
  );
  return m || null;
}

/* ---------- result render ---------- */
function locStrip(area, district, state){
  return `
  <div class="loc-strip">
    <div class="loc-chip"><span class="lbl">Area</span><b>${esc(area)}</b></div>
    <div class="loc-chip"><span class="lbl">District</span><b>${esc(district)}</b></div>
    <div class="loc-chip"><span class="lbl">State</span><b>${esc(state)}</b></div>
  </div>`;
}

function renderResult(pin, area, district, state, m){
  const result = $('resultWrap');
  if (m){
    const statusCls = (m.status || '').toLowerCase() === 'active' ? 'ok' : 'warn';
    result.innerHTML = locStrip(area, district, state) + `
    <div class="dealer-card">
      <span class="badge ${statusCls}">${esc(m.status || 'Active')} · ${esc(m.type || 'Authorized')}</span>
      <h3>${esc(m.dealer)}</h3>
      <div class="firm">${esc(m.firm || '')}${m.city ? ' · ' + esc(m.city) : ''}</div>
      <div class="grid">
        <div class="item"><div class="k">Authority</div><div class="v">${m.type === 'Exclusive State' ? esc(state) + ' (poori state)' : esc((m.districts||[]).join(', '))}</div></div>
        <div class="item"><div class="k">Contact</div><div class="v"><a href="tel:${esc(m.phone)}">${esc(m.phone || '—')}</a></div></div>
        <div class="item"><div class="k">Agreement Since</div><div class="v">${esc(m.since || '—')}</div></div>
        <div class="item"><div class="k">PIN Checked</div><div class="v">${pin}</div></div>
      </div>
    </div>`;
  } else {
    result.innerHTML = locStrip(area, district, state) + `
    <div class="dealer-card none">
      <span class="badge warn">Open Territory</span>
      <h3>Koi authorized dealer nahi</h3>
      <div class="firm">${esc(district)}, ${esc(state)} me abhi Litpax ki dealer authority assign nahi hai.</div>
      <div class="note">Naye dealer enquiry ke liye Sales team ko forward karo, ya direct order Litpax se process hoga.</div>
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
