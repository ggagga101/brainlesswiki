const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
let current = new URLSearchParams(location.search).get("title") || "대문";

function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function inline(s){
  s=esc(s);
  s=s.replace(/\[\[([^\]]+)\]\]/g,(_,t)=>`<a class="wiki" onclick="openDoc('${t.replace(/'/g,"\\'")}')">${t}</a>`);
  s=s.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>");
  s=s.replace(/`(.+?)`/g,"<code>$1</code>");
  return s;
}
function wiki(src){
  const lines=src.split(/\r?\n/);let o="",table=false,list=false,header=false;
  for(const line of lines){
    if(/^\|.*\|$/.test(line.trim())){
      const cells=line.trim().slice(1,-1).split("|").map(x=>x.trim());
      if(!table){o+='<table class="wikitable">';table=true;header=false}
      if(/^\|?\s*-+/.test(line)){header=true;continue}
      const tag=header?"td":"th";o+="<tr>"+cells.map(c=>`<${tag}>${inline(c)}</${tag}>`).join("")+"</tr>";continue
    } else if(table){o+="</table>";table=false}
    if(/^\*\s+/.test(line)){
      if(!list){o+="<ul>";list=true}o+=`<li>${inline(line.replace(/^\*\s+/,""))}</li>`;continue
    } else if(list){o+="</ul>";list=false}
    if(/^###\s+/.test(line))o+=`<h3>${inline(line.replace(/^###\s+/,""))}</h3>`;
    else if(/^##\s+/.test(line))o+=`<h2>${inline(line.replace(/^##\s+/,""))}</h2>`;
    else if(/^#\s+/.test(line))o+=`<h1 class="title">${inline(line.replace(/^#\s+/,""))}</h1>`;
    else if(/^>\s?/.test(line))o+=`<div class="box">${inline(line.replace(/^>\s?/,""))}</div>`;
    else if(line.trim())o+=`<p>${inline(line)}</p>`;
  }
  if(list)o+="</ul>";if(table)o+="</table>";return o;
}
function setTitle(t){current=t;history.replaceState(null,"","?title="+encodeURIComponent(t));}

async function openDoc(title){
  setTitle(title);
  const {data,error}=await sb.from("documents").select("*").eq("title",title).maybeSingle();
  if(error){return fail(error.message)}
  if(!data){
    $("app").innerHTML=`<h1 class="title">${esc(title)}</h1><div class="empty">아직 없는 문서입니다.<br><br><button class="primary" onclick="edit()">이 문서 만들기</button></div>`;
    return;
  }
  $("app").innerHTML=`<div class="actions"><button onclick="edit()">✏️ 편집</button><button onclick="history()">🕘 역사</button><button onclick="discussion()">💬 토론</button></div>
  <div class="meta">${esc(data.category||"분류: 미분류")} · ${esc(data.author||"익명")} · ${new Date(data.updated_at).toLocaleString("ko-KR")}</div>
  <div>${wiki(data.content)}</div>`;
}
function fail(m){$("app").innerHTML=`<div class="box"><b>연결 오류</b><br>${esc(m)}<br><br>js/config.js에 Supabase 정보를 넣었는지 확인하세요.</div>`}

async function edit(){
  const {data}=await sb.from("documents").select("*").eq("title",current).maybeSingle();
  const content=data?.content||`# ${current}\n\n새 문서를 작성하세요.`;
  const cat=data?.category||"분류: 미분류";
  $("app").innerHTML=`<div class="editor"><h1 class="title">${esc(current)} 편집</h1>
  <p class="meta">[[문서명]], **굵게**, # 제목, * 목록, 표를 사용할 수 있습니다.</p>
  <input id="cat" value="${esc(cat)}" placeholder="분류">
  <textarea id="content">${esc(content)}</textarea><br><br>
  <button class="primary" onclick="saveDoc()">저장</button> <button onclick="openDoc(current)">취소</button></div>`;
}
async function saveDoc(){
  const content=$("content").value,category=$("cat").value||"분류: 미분류";
  if(!content.trim())return alert("내용을 입력하세요.");
  const author=prompt("편집자 이름","익명")||"익명";
  const {data:old}=await sb.from("documents").select("*").eq("title",current).maybeSingle();
  const now=new Date().toISOString();
  if(old){
    await sb.from("revisions").insert({title:current,content:old.content,author:old.author||"익명",created_at:old.updated_at});
  }else{
    await sb.from("revisions").insert({title:current,content,author,created_at:now});
  }
  const {error}=await sb.from("documents").upsert({title:current,content,category,author,updated_at:now});
  if(error)return alert(error.message);
  openDoc(current);
}
async function search(){
  const q=$("q").value.trim();if(!q)return;
  const {data,error}=await sb.from("documents").select("title,category,author,updated_at").or(`title.ilike.%${q}%,content.ilike.%${q}%`).order("title");
  if(error)return fail(error.message);
  $("app").innerHTML=`<h1 class="title">검색 결과</h1><p>"${esc(q)}" — ${data.length}개</p>`+
  (data.map(d=>`<div class="card"><a class="wiki" onclick="openDoc('${d.title.replace(/'/g,"\\'")}')"><b>${esc(d.title)}</b></a><div class="meta">${esc(d.category||"")}</div></div>`).join("")||`<div class="empty">검색 결과가 없습니다.</div>`);
}
async function allDocs(){
  const {data,error}=await sb.from("documents").select("title,category").order("title");
  if(error)return fail(error.message);
  $("app").innerHTML=`<h1 class="title">모든 문서</h1>`+data.map(d=>`<div class="card"><a class="wiki" onclick="openDoc('${d.title.replace(/'/g,"\\'")}')">${esc(d.title)}</a></div>`).join("");
}
async function recent(){
  const {data,error}=await sb.from("documents").select("title,author,updated_at").order("updated_at",{ascending:false}).limit(30);
  if(error)return fail(error.message);
  $("app").innerHTML=`<h1 class="title">최근 변경</h1>`+data.map(d=>`<div class="card"><a class="wiki" onclick="openDoc('${d.title.replace(/'/g,"\\'")}')">${esc(d.title)}</a><div class="meta">${esc(d.author||"익명")} · ${new Date(d.updated_at).toLocaleString("ko-KR")}</div></div>`).join("");
}
async function randomDoc(){
  const {data,error}=await sb.from("documents").select("title");
  if(error||!data?.length)return;
  openDoc(data[Math.floor(Math.random()*data.length)].title);
}
async function history(){
  const {data,error}=await sb.from("revisions").select("id,author,created_at").eq("title",current).order("id",{ascending:false});
  if(error)return fail(error.message);
  $("app").innerHTML=`<h1 class="title">${esc(current)}/역사</h1>`+(data.map(r=>`<div class="card"><b>${new Date(r.created_at).toLocaleString("ko-KR")}</b> · ${esc(r.author||"익명")}</div>`).join("")||`<div class="empty">역사가 없습니다.</div>`);
}
async function discussion(){
  const {data,error}=await sb.from("discussions").select("*").eq("title",current).order("id",{ascending:false});
  if(error)return fail(error.message);
  $("app").innerHTML=`<h1 class="title">${esc(current)}/토론</h1><div class="box">이 문서에 대한 의견을 남겨보세요.</div>
  <textarea id="msg" placeholder="토론 내용을 입력하세요." style="min-height:130px"></textarea><br><br>
  <button class="primary" onclick="postDiscussion()">등록</button><h2>토론</h2>
  ${data.map(r=>`<div class="comment">${inline(r.message)}<br><small>${esc(r.author||"익명")} · ${new Date(r.created_at).toLocaleString("ko-KR")}</small></div>`).join("")||`<div class="empty">아직 토론이 없습니다.</div>`}`;
}
async function postDiscussion(){
  const message=$("msg").value.trim();if(!message)return;
  const author=prompt("이름","익명")||"익명";
  const {error}=await sb.from("discussions").insert({title:current,author,message,created_at:new Date().toISOString()});
  if(error)return alert(error.message);discussion();
}
async function categories(){
  const {data,error}=await sb.from("documents").select("title,category");
  if(error)return fail(error.message);const c={};
  data.forEach(d=>(c[d.category||"분류: 미분류"]??=[]).push(d.title));
  $("app").innerHTML=`<h1 class="title">분류</h1>`+Object.entries(c).map(([k,v])=>`<div class="card"><b>${esc(k)}</b><br>${v.map(t=>`<a class="wiki" onclick="openDoc('${t.replace(/'/g,"\\'")}')">${esc(t)}</a>`).join(" · ")}</div>`).join("");
}
function about(){$("app").innerHTML=`<h1 class="title">까위키 소개</h1><p>까위키 v3는 무료 웹 호스팅에서 돌아가도록 만든 서버리스 위키입니다.</p><h2>사용 기술</h2><ul><li>GitHub Pages</li><li>Supabase</li><li>HTML / CSS / JavaScript</li></ul><p>문서는 인터넷의 Supabase 데이터베이스에 저장되므로 여러 사람이 같은 위키를 볼 수 있습니다.</p>`}
$("q").addEventListener("keydown",e=>{if(e.key==="Enter")search()});
openDoc(current);
