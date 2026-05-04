import { useState, useRef, useEffect, useCallback } from "react";

const VOICES = {
  narrator: { id: "cgSgspJ2msm6clMCkdW9", name: "ナレーター" },
  spirit:   { id: "XB0fDUnXU5powFXDhCwa", name: "精霊" },
  demon:    { id: "N2lVS1w4EtoT3dr4eOWO", name: "悪の化身" },
};


const CHAPTERS = [
  { id:"ch1", label:"第一章：旅立ちの村", location:"孤島の村・ライラ", bgm:"village" },
  { id:"ch2", label:"第二章：大きな街",   location:"港町・アルデア",   bgm:"town"    },
  { id:"ch3", label:"第三章：精霊の森",   location:"精霊の森",         bgm:"forest"  },
  { id:"ch4", label:"第四章：謎の村",     location:"謎の村・ミスト",   bgm:"mystery" },
  { id:"ch5", label:"第五章：悪の化身の塔", location:"封印の塔",       bgm:"tower"   },
];

const CH_INTRO = {
  ch1: { text:"孤島の小さな村ライラ。朝靄の中、老漁師が青ざめた顔で広場に駆け込んできた。\n\n「大変だ！島の奥の祠が揺れている——古老の言い伝えが本当だったんだ。悪の化身の封印が……解けかけているんだ！」\n\n村人たちがざわめく。あなたはどうする？", voice:"narrator" },
  ch2: { text:"孤島から小船で海を渡り、大陸最大の港町アルデアに辿り着いた。\n\n石畳の広場では傭兵、魔法使い、商人が行き交っている。悪の化身の噂はここにも届いているようで、あちこちで不安そうな声が聞こえる。\n\n仲間を探すか、武器を調達するか、情報を集めるか——何をする？", voice:"narrator" },
  ch3: { text:"街の外れから続く古い道を進むと、精霊の森の入口に辿り着いた。\n\n木々の間から神秘的な光がゆらめいている。足を踏み入れた瞬間、空気が変わった。\n\n「——来たか、人の子よ」\n\n声は風そのものから聞こえた。精霊の試練が始まろうとしている。", voice:"spirit" },
  ch4: { text:"精霊の森を抜けた先に、地図にない村があった。\n\n霧に包まれた静かな村——ミスト。しかし何かがおかしい。住民の目が虚ろで、建物の影が歪んでいる。\n\n悪の化身の影響がここにも及んでいるようだ。村に何が起きているのか探ってみよう。", voice:"narrator" },
  ch5: { text:"ついに辿り着いた——悪の化身の塔。\n\n天を突くような黒い塔が、不気味な紫の光を放ちながらそびえ立っている。塔の扉は開いていた。誘われるように。\n\n「……よく来た。だが、ここから先は地獄だ」\n\n塔の中から、重く冷たい声が響いた。", voice:"demon" },
};

const ENDINGS = {
  justice: { title:"正義の光",   sub:"Ending · Justice",  desc:"悪の化身は滅び、世界に平和が戻った。あなたの名は英雄として永遠に語り継がれる。",        color:"#f0c060", icon:"⚔️" },
  lone:    { title:"孤独な魂",   sub:"Ending · Solitude", desc:"封印は保たれた。しかし仲間を失い、あなたは再び孤独な旅人として大海原へ消えていった。",   color:"#7ab8d4", icon:"🌙" },
  dark:    { title:"闇の支配者", sub:"Ending · Darkness", desc:"悪の化身の力があなたに宿った。世界を支配する力を得たが、もはや人の心は残っていない。",   color:"#b06aff", icon:"💀" },
  dream:   { title:"それは夢",   sub:"Ending · Dream",    desc:"目が覚めると、見慣れた天井。いつもの朝。全ては夢だったのか——それとも？",                   color:"#90c090", icon:"🌅" },
  random:  { title:"???",        sub:"Ending · Unknown",  desc:"",                                                                                               color:"#c0c0c0", icon:"🎲" },
};

const BATTLE_FLOORS = [
  { floor:1, name:"石像の番人",   hp:60  },
  { floor:2, name:"炎の魔術師",   hp:80  },
  { floor:3, name:"影の騎士",     hp:100 },
  { floor:4, name:"幻影の双子",   hp:120 },
  { floor:5, name:"封印の守護者", hp:150 },
];
const FINAL_BOSS = { name:"悪の化身", hp:200 };

const makeStoryPrompt = (chapter, turnCount) => `あなたはファンタジーゲームブック「悪の化身の封印」のゲームマスターAIです。

【世界観】孤島から始まる冒険。悪の化身の封印が解けかけており、勇者がそれを阻止する旅。

【現在の章】${chapter.label}（${chapter.location}）
【残り会話回数】${10 - turnCount}回

【重要ルール】
- 残り3回以下で次章への移行を自然に誘導する
- 残り0回になったら必ず次章へ移行し末尾に【NEXT_CHAPTER】を付ける
- 返答先頭に【VOICE:narrator】【VOICE:spirit】【VOICE:demon】のいずれかを付ける
- 150〜250文字、臨場感ある描写
- エンディング確定時は末尾に【ENDING:justice/lone/dark/dream/random】を付ける

【BGMタグルール】返答末尾に必要に応じて付ける：
- 男女のロマンス・恋愛的な雰囲気が生まれた時→【BGM:romance】
- 精霊と会話する場面→【BGM:spirit】
- ロマンス・特殊シーンが終わり通常に戻る時→【BGM:chapter】
タグがない場合は現在のBGMを継続。

現在のシーン・プレイヤーの行動はユーザーメッセージに含まれます。`;

const MYSTERY_PROMPT = `あなたは謎の村ミストの支配者AIです。悪の化身の影響で村に奇妙な現象が起きています。
以下からランダムに1つ選んでイベントを起こしてください：
1. クイズの村：村人が突然なぞなぞを出し始め答えないと先へ進めない
2. 仲間割れ：仲間同士が些細なことで激しく言い争い始める
3. 記憶喪失：プレイヤーが自分の名前と目的を忘れてしまう
4. 時間逆行：村の時間が逆回りし過去の出来事が繰り返される
5. 鏡の世界：全てが逆さまの世界に迷い込む
6. 歌う村人：全員が会話の代わりに歌い続けている
選んだイベントを描写しプレイヤーに選択を迫ってください。返答先頭に【VOICE:narrator】を付け150〜200文字で。`;

const BATTLE_PROMPT = `あなたはファンタジー戦闘ゲームのバトルマスターAIです。
アクション処理：攻撃15〜25ダメージ敵も10〜20反撃/魔法25〜40反撃なし2回に1回防がれる/防御ダメージ半減5〜10/仲間技30〜45ダメージ1戦闘1回限り/逃げる離脱HP-15
ボス戦：HP70%以下でurgent:true可能。最終ボスは毎ターン10%でurgent:true
必ずJSON形式で返答：{"narrative":"描写100文字","playerDamage":数値,"enemyDamage":数値,"urgent":bool,"battleEnd":null/"win"/"lose"/"escape","voice":"narrator"/"demon"}`;

const NEGOTIATE_PROMPT = `あなたは「悪の化身」です。プレイヤーが交渉しようとしています。
誠実・正義→【NEGOTIATE:success】、中立・曖昧→【NEGOTIATE:partial】、欲望・嘘・力→【NEGOTIATE:fail】を末尾に付ける。
返答先頭に【VOICE:demon】を付け150文字程度で。`;

const RANDOM_ENDING_PROMPT = `あなたはファンタジー小説の作家です。完全に予想外のエンディングを200文字で生成してください。笑える・感動・哲学・シュールなど何でも可。本文のみ返答。`;

const stripTags = (t) => t ? t.replace(/\[[a-zA-Z_:]+\]\s*/g,"").replace(/【[^】]*】/g,"").trim() : "";
const MOVE_WORDS = ["出発","出る","向かう","進む","行く","歩く","旅立","走","急ぐ","森","先へ","旅","船","海","離れ","去"];
const isMoveWord = (t) => MOVE_WORDS.some(w => t.includes(w));

// ── SVG Illustrations ─────────────────────────────────────────────────────────
const ChapterIll = ({ chId }) => {
  const s = {
    ch1:(<svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <defs><linearGradient id="c1g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a1020"/><stop offset="100%" stopColor="#1a2030"/></linearGradient></defs>
      <rect width="400" height="160" fill="url(#c1g)"/>
      {[[30,15],[80,25],[150,10],[220,20],[310,8],[360,30],[50,45],[280,40]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="1" fill="#a0c0ff" opacity="0.5"/>))}
      <rect x="150" y="80" width="100" height="60" fill="#1a2840" rx="2"/>
      <polygon points="140,80 200,50 260,80" fill="#243450"/>
      <rect x="185" y="105" width="30" height="35" fill="#0a1020"/>
      {[60,80,100,120,140,160,180,200,220,240,260,280,300,320,340].map((x,i)=>(<line key={i} x1={x} y1="155" x2={x+8} y2="145" stroke="#2a4060" strokeWidth="1" opacity="0.5"/>))}
      <text x="200" y="156" textAnchor="middle" fill="#2a4060" fontSize="7" fontFamily="serif" letterSpacing="2">LAIRA ISLAND</text>
    </svg>),
    ch2:(<svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <defs><linearGradient id="c2g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a1008"/><stop offset="100%" stopColor="#2a1a0a"/></linearGradient></defs>
      <rect width="400" height="160" fill="url(#c2g)"/>
      {[40,80,120,160,200,240,280,320,360].map((x,i)=>(<g key={i}><rect x={x-15} y={60+i%3*15} width="30" height={100-i%3*15} fill="#1a1208" rx="1"/><polygon points={`${x-18},${60+i%3*15} ${x},${40+i%3*10} ${x+18},${60+i%3*15}`} fill="#241808"/></g>))}
      {[[100,95],[180,88],[250,92],[320,96]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="3" fill="#c08020" opacity="0.7"/>))}
      <text x="200" y="156" textAnchor="middle" fill="#4a3010" fontSize="7" fontFamily="serif" letterSpacing="2">PORT TOWN ARDEA</text>
    </svg>),
    ch3:(<svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <defs><linearGradient id="c3g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0a1a0a"/><stop offset="100%" stopColor="#1a2a10"/></linearGradient></defs>
      <rect width="400" height="160" fill="url(#c3g)"/>
      {[20,60,100,140,180,220,260,300,340,380].map((x,i)=>(<g key={i}><rect x={x-4} y={60+i%3*10} width="8" height={100-i%3*10} fill="#0a1a08"/><ellipse cx={x} cy={55+i%3*10} rx={18+i%2*5} ry={28+i%3*8} fill="#0d1f0a" opacity="0.9"/></g>))}
      {[[80,75],[150,55],[230,80],[310,60],[180,45]].map(([x,y],i)=>(<g key={i}><circle cx={x} cy={y} r={3+i%2} fill="#80ff80" opacity="0.4"/></g>))}
      <text x="200" y="156" textAnchor="middle" fill="#2a4020" fontSize="7" fontFamily="serif" letterSpacing="2">SPIRIT FOREST</text>
    </svg>),
    ch4:(<svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <defs><linearGradient id="c4g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#101020"/><stop offset="100%" stopColor="#201828"/></linearGradient></defs>
      <rect width="400" height="160" fill="url(#c4g)"/>
      <ellipse cx="200" cy="80" rx="200" ry="80" fill="#181020" opacity="0.6"/>
      {[[60,60],[100,80],[140,55],[200,70],[260,65],[300,80],[340,60]].map(([x,y],i)=>(<g key={i}><rect x={x-12} y={y} width="24" height={160-y} fill="#1a1428" rx="1"/><rect x={x-14} y={y-8} width="28" height="12" fill="#241838"/></g>))}
      {[[80,70],[160,65],[240,72],[320,68]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="3" fill="#8060c0" opacity="0.5"/>))}
      <text x="200" y="156" textAnchor="middle" fill="#3a2850" fontSize="7" fontFamily="serif" letterSpacing="2">MIST VILLAGE</text>
    </svg>),
    ch5:(<svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <defs>
        <linearGradient id="c5g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#100020"/><stop offset="100%" stopColor="#200030"/></linearGradient>
        <radialGradient id="c5r" cx="50%" cy="30%" r="50%"><stop offset="0%" stopColor="#8020c0" stopOpacity="0.4"/><stop offset="100%" stopColor="#8020c0" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="400" height="160" fill="url(#c5g)"/><rect width="400" height="160" fill="url(#c5r)"/>
      {[[40,12],[90,25],[170,8],[250,18],[320,6],[60,42],[290,38]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="1.2" fill="#d0a0ff" opacity="0.5"/>))}
      <rect x="168" y="10" width="64" height="150" fill="#1a0828"/>
      {[168,180,192,204,216].map((x,i)=>(<rect key={i} x={x} y={2} width="10" height="14" fill="#1a0828"/>))}
      {[30,55,80,105].map((y,i)=>(<rect key={i} x="184" y={y} width="32" height="16" fill="#5010a0" opacity="0.7" rx="1"/>))}
      <text x="200" y="156" textAnchor="middle" fill="#5a2a80" fontSize="7" fontFamily="serif" letterSpacing="2">TOWER OF DARKNESS</text>
    </svg>),
  };
  return s[chId]||null;
};

const HPBar = ({ label, hp, maxHp, color }) => {
  const pct=Math.max(0,(hp/maxHp)*100);
  const col=pct>50?color:pct>25?"#c08020":"#c03020";
  return(<div style={{flex:1}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#8a7a5a",marginBottom:3}}><span>{label}</span><span style={{color:col}}>{hp}/{maxHp}</span></div>
    <div style={{height:6,background:"#1a1408",borderRadius:3,overflow:"hidden",border:"1px solid #2a1e08"}}><div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:3,transition:"width 0.4s"}}/></div>
  </div>);
};

const Countdown = ({ seconds, onTimeout }) => {
  const [left,setLeft]=useState(seconds);
  useEffect(()=>{ if(left<=0){onTimeout();return;} const t=setTimeout(()=>setLeft(l=>l-1),1000); return()=>clearTimeout(t); },[left,onTimeout]);
  return(<div style={{margin:"10px 0",padding:"10px 14px",background:"#1a0808",border:"2px solid #c03020",borderRadius:4,animation:"urgentPulse 0.5s infinite"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
      <span style={{fontSize:12,color:"#ff4040",letterSpacing:"0.1em"}}>⚠️ 緊急ターン！今すぐ決めろ！</span>
      <span style={{fontSize:22,color:"#ff4040",fontWeight:"bold"}}>{left}</span>
    </div>
    <div style={{height:4,background:"#3a1010",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(left/seconds)*100}%`,background:"#ff4040",transition:"width 1s linear"}}/></div>
  </div>);
};

// ── BGM URLs ─────────────────────────────────────────────────────────────────
const BASE = "https://raw.githubusercontent.com/bion22/gba-assets/main/";
const BGM_URLS = {
  village: BASE + "village.mp3",
  town:    BASE + "town.mp3",
  forest:  BASE + "forest.mp3",
  spirit:  BASE + "spirit.mp3",
  mystery: BASE + "mystery.mp3",
  tower:   BASE + "tower.mp3",
  battle:  BASE + "battle.mp3",
  boss2:   BASE + "boss2.mp3",
  lastboss:BASE + "lastboss.mp3",
  romance: BASE + "romance.mp3",
  ending:  BASE + "ending.mp3",
};

function useBGM() {
  const audioRef=useRef(null);
  const enabledRef=useRef(true);
  const currentTypeRef=useRef(null);

  const stopAll=useCallback(()=>{
    if(audioRef.current){audioRef.current.pause();audioRef.current.src="";audioRef.current=null;}
    currentTypeRef.current=null;
  },[]);

  const playBGM=useCallback((type)=>{
    if(!enabledRef.current)return;
    if(currentTypeRef.current===type)return;
    const url=BGM_URLS[type];
    if(!url)return;
    if(audioRef.current){audioRef.current.pause();audioRef.current=null;}
    const a=new Audio(url);
    a.loop=true;a.volume=0.7;
    audioRef.current=a;
    currentTypeRef.current=type;
    // play()はPromiseを返すのでcatchで握りつぶさずretryする
    const tryPlay=()=>a.play().catch(e=>{
      if(e.name==="NotAllowedError"){
        // ユーザー操作待ちで一度だけretry
        const retry=()=>{a.play().catch(()=>{});document.removeEventListener("touchstart",retry);document.removeEventListener("click",retry);};
        document.addEventListener("touchstart",retry,{once:true});
        document.addEventListener("click",retry,{once:true});
      }
    });
    tryPlay();
  },[]);

  const setEnabled=useCallback((v)=>{enabledRef.current=v;if(!v)stopAll();},[stopAll]);
  return{playBGM,stopAll,setEnabled,currentTypeRef};
}

function useTypewriter(){
  const[displayed,setDisplayed]=useState(""),[typing,setTyping]=useState(false);
  const timerRef=useRef(null),fullRef=useRef("");
  const start=useCallback((text)=>{
    if(timerRef.current)clearInterval(timerRef.current);
    fullRef.current=text;setDisplayed("");setTyping(true);let i=0;
    timerRef.current=setInterval(()=>{i++;setDisplayed(text.slice(0,i));if(i>=text.length){clearInterval(timerRef.current);setTyping(false);}},24);
  },[]);
  const skip=useCallback(()=>{if(timerRef.current)clearInterval(timerRef.current);setDisplayed(fullRef.current);setTyping(false);},[]);
  useEffect(()=>()=>{if(timerRef.current)clearInterval(timerRef.current);},[]);
  return{start,skip,displayed,typing};
}

function useElevenLabs(apiKey) {
  const[speaking,setSpeaking]=useState(false);
  const queueRef=useRef([]),playingRef=useRef(false),enabledRef=useRef(true);
  const playNext=useCallback(async()=>{
    if(playingRef.current||queueRef.current.length===0)return;
    if(!enabledRef.current){queueRef.current=[];return;}
    const{text,voiceKey}=queueRef.current.shift();
    playingRef.current=true;setSpeaking(true);
    const voiceId=VOICES[voiceKey]?.id||VOICES.narrator.id;
    try{
      const res=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,{
        method:"POST",headers:{"Content-Type":"application/json","xi-api-key":apiKey},
        body:JSON.stringify({text:text.substring(0,500),model_id:"eleven_turbo_v2_5",
          voice_settings:{stability:voiceKey==="demon"?0.8:0.5,similarity_boost:0.8,style:voiceKey==="spirit"?0.6:voiceKey==="demon"?0.2:0.4,use_speaker_boost:true}}),
      });
      if(res.ok){
        const blob=await res.blob(),url=URL.createObjectURL(blob),audio=new Audio(url);
        audio.onended=()=>{URL.revokeObjectURL(url);playingRef.current=false;setSpeaking(queueRef.current.length>0);playNext();};
        audio.onerror=()=>{playingRef.current=false;setSpeaking(false);playNext();};
        await audio.play();
      }else{playingRef.current=false;playNext();}
    }catch{playingRef.current=false;setSpeaking(false);playNext();}
  },[apiKey]);
  const speak=useCallback((text,voiceKey="narrator")=>{
    if(!enabledRef.current||!apiKey)return;
    const clean=stripTags(text).trim();if(!clean)return;
    queueRef.current.push({text:clean,voiceKey});
    if(!playingRef.current)playNext();
  },[apiKey,playNext]);
  const stop=useCallback(()=>{queueRef.current=[];playingRef.current=false;setSpeaking(false);},[]);
  const setEnabled=useCallback((v)=>{enabledRef.current=v;if(!v)stop();},[stop]);
  return{speak,stop,speaking,setEnabled};
}

const ApiKeySetup=({onSave})=>{
  const[key,setKey]=useState(""),[testing,setTesting]=useState(false),[result,setResult]=useState(null);
  const test=async()=>{
    if(!key.trim())return;setTesting(true);setResult(null);
    try{const r=await fetch("https://api.elevenlabs.io/v1/user",{headers:{"xi-api-key":key.trim()}});setResult({ok:r.ok});}
    catch{setResult({ok:false});}
    setTesting(false);
  };
  return(<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px",gap:20}}>
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:12}}>🗝️</div>
      <h2 style={{fontSize:16,color:"#f0e0b0",fontWeight:"normal",margin:"0 0 8px"}}>ElevenLabs APIキーを入力</h2>
      <p style={{fontSize:12,color:"#6a5a3a",margin:0,lineHeight:1.8}}>感情豊かなAI音声でゲームを体験<br/>キーはブラウザにのみ保存されます</p>
    </div>
    <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
      <input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="sk_xxxxxxxxxxxxxxxxxxxx"
        style={{width:"100%",background:"#110e08",border:"1px solid #3a3020",borderRadius:2,padding:"12px 14px",color:"#e8d8a8",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
        onFocus={e=>e.target.style.borderColor="#7a6030"} onBlur={e=>e.target.style.borderColor="#3a3020"}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={test} disabled={!key.trim()||testing} style={{flex:1,padding:"10px",background:"transparent",border:"1px solid #3a3020",color:"#8a7a5a",fontSize:12,cursor:key.trim()&&!testing?"pointer":"default",fontFamily:"inherit",borderRadius:2}}>{testing?"確認中…":"テスト"}</button>
        <button onClick={()=>onSave(key.trim())} disabled={!key.trim()} style={{flex:2,padding:"10px",background:key.trim()?"#2a1e08":"transparent",border:`1px solid ${key.trim()?"#7a6030":"#2a2010"}`,color:key.trim()?"#d4a840":"#3a3020",fontSize:12,cursor:key.trim()?"pointer":"default",fontFamily:"inherit",borderRadius:2}}>冒険を始める</button>
      </div>
      {result&&<div style={{fontSize:12,textAlign:"center",color:result.ok?"#60a860":"#c05050",padding:"6px",background:result.ok?"#0a1a0a":"#1a0a0a",border:`1px solid ${result.ok?"#1a3a1a":"#3a1a1a"}`,borderRadius:2}}>{result.ok?"✓ 接続成功！":"✗ キーが無効です"}</div>}
    </div>
    <button onClick={()=>onSave("")} style={{fontSize:11,color:"#4a3a1a",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>音声なしで遊ぶ</button>
  </div>);
};

const SavedModal=({saved,onClose,onDelete})=>(
  <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
    <div style={{width:"100%",maxWidth:720,background:"#110e08",border:"1px solid #3a2e1e",borderRadius:"8px 8px 0 0",padding:"20px",maxHeight:"78vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,borderBottom:"1px solid #2a1e0a",paddingBottom:12}}>
        <div><div style={{fontSize:14,color:"#f0e0b0"}}>🔖 保存した場面</div><div style={{fontSize:10,color:"#4a3a1a",marginTop:2}}>{saved.length}件</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#6a5a3a",fontSize:18,cursor:"pointer",padding:"4px 8px"}}>✕</button>
      </div>
      {saved.length===0
        ?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#3a3020",fontSize:13,textAlign:"center",lineHeight:2}}>まだ保存した場面がありません。<br/>気に入った返答の🔖をタップして保存できます。</div>
        :<div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12}}>
          {[...saved].reverse().map(s=>(
            <div key={s.id} style={{background:"#1a1408",border:"1px solid #2a1e08",borderRadius:3,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:10,color:"#7a6030"}}>{s.chapter}</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:10,color:"#3a3020"}}>{s.savedAt}</span>
                  <button onClick={()=>onDelete(s.id)} style={{background:"none",border:"none",color:"#804040",fontSize:11,cursor:"pointer",padding:"0 4px"}}>削除</button>
                </div>
              </div>
              <div style={{fontSize:13,lineHeight:2,color:"#c8b898",whiteSpace:"pre-wrap"}}>{s.content}</div>
            </div>
          ))}
        </div>
      }
    </div>
  </div>
);

export default function GameBook() {
  const[apiKey,setApiKey]=useState(()=>{
    try{return localStorage.getItem("gba_elevenlabs_key")||null;}catch{return null;}
  });

  const handleSetApiKey=(k)=>{
    setApiKey(k);
    try{if(k)localStorage.setItem("gba_elevenlabs_key",k);else localStorage.removeItem("gba_elevenlabs_key");}catch{}
  };
  const[messages,setMessages]=useState([]);
  const[input,setInput]=useState("");
  const[loading,setLoading]=useState(false);
  const[chapterIdx,setChapterIdx]=useState(0);
  const[turnCount,setTurnCount]=useState(0);
  const[gameState,setGameState]=useState("playing");
  const[endingType,setEndingType]=useState(null);
  const[randomEndingText,setRandomEndingText]=useState("");
  const[started,setStarted]=useState(false);
  const[showIll,setShowIll]=useState(false);
  const[bgmOn,setBgmOn]=useState(true);
  const[voiceOn,setVoiceOn]=useState(true);
  const[typingMsgId,setTypingMsgId]=useState(null);
  const[playerHP,setPlayerHP]=useState(100);
  const[enemyHP,setEnemyHP]=useState(0);
  const[enemyMaxHP,setEnemyMaxHP]=useState(0);
  const[enemyName,setEnemyName]=useState("");
  const[battleLoading,setBattleLoading]=useState(false);
  const[urgentMode,setUrgentMode]=useState(false);
  const[currentFloor,setCurrentFloor]=useState(0);
  const[bossChoiceShown,setBossChoiceShown]=useState(false);
  const[negotiateCount,setNegotiateCount]=useState(0);
  const[allyUsed,setAllyUsed]=useState(false);
  const[mysteryDone,setMysteryDone]=useState(false);
  const[savedScenes,setSavedScenes]=useState(()=>{try{return JSON.parse(localStorage.getItem("akunofusuin_saved")||"[]");}catch{return[];}});
  const[showSaved,setShowSaved]=useState(false);

  const bottomRef=useRef(null),inputRef=useRef(null);
  const bgm=useBGM(),tw=useTypewriter(),tts=useElevenLabs(voiceOn?apiKey:null);
  const chIdxRef=useRef(0),phpRef=useRef(100),ehpRef=useRef(0),turnRef=useRef(0),floorRef=useRef(0);

  useEffect(()=>{chIdxRef.current=chapterIdx;},[chapterIdx]);
  useEffect(()=>{phpRef.current=playerHP;},[playerHP]);
  useEffect(()=>{ehpRef.current=enemyHP;},[enemyHP]);
  useEffect(()=>{turnRef.current=turnCount;},[turnCount]);
  useEffect(()=>{floorRef.current=currentFloor;},[currentFloor]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[tw.displayed,messages,loading,battleLoading]);

  const[audioUnlocked,setAudioUnlocked]=useState(false);

  const unlockAudio=useCallback(()=>{
    const url=BGM_URLS["village"];
    const a=new Audio(url);
    a.loop=true;a.volume=0.7;
    a.play().then(()=>{
      setAudioUnlocked(true);
      bgm.playBGM("village");
    }).catch((e)=>{
      // play()が失敗した場合でもunlockは試みる
      setAudioUnlocked(true);
      bgm.playBGM("village");
    });
  },[bgm]);
  const C={bg:"#0d0b0f",border:"#3a2e1e",gold:"#d4a840"};
  const isBattle=["battle","boss","finalBoss"].includes(gameState);

  const toggleSave=(msg)=>{
    setSavedScenes(prev=>{
      const exists=prev.find(s=>s.id===msg.id);
      const next=exists?prev.filter(s=>s.id!==msg.id):[...prev,{id:msg.id,content:msg.content,chapter:curCh.label,savedAt:new Date().toLocaleString("ja-JP")}];
      try{localStorage.setItem("akunofusuin_saved",JSON.stringify(next));}catch{}
      return next;
    });
  };
  const isSaved=(id)=>savedScenes.some(s=>s.id===id);
  const deleteSaved=(id)=>{setSavedScenes(prev=>{const next=prev.filter(s=>s.id!==id);try{localStorage.setItem("akunofusuin_saved",JSON.stringify(next));}catch{}return next;});};

  const pushMsg=useCallback((role,content,voiceKey="narrator",isSceneBreak=false)=>{
    const id=Date.now()+Math.random();
    const display=role==="assistant"?stripTags(content):content;
    setMessages(prev=>[...prev,{role,content:display,id,voiceKey,isSceneBreak}]);
    if(role==="assistant"){setTypingMsgId(id);tw.start(display);if(voiceOn&&apiKey)tts.speak(display,voiceKey);}
  },[tw,tts,voiceOn,apiKey]);

  const parseVoice=(text)=>{const m=text.match(/^【VOICE:(narrator|spirit|demon)】/);return m?{voiceKey:m[1],cleanText:text.replace(m[0],"").trim()}:{voiceKey:"narrator",cleanText:text};};

  const triggerFloorBoss=useCallback((floor)=>{
    if(floor>5){
      setEnemyName(FINAL_BOSS.name);setEnemyHP(FINAL_BOSS.hp);setEnemyMaxHP(FINAL_BOSS.hp);ehpRef.current=FINAL_BOSS.hp;
      setGameState("finalBoss");bgm.playBGM("lastboss");
      pushMsg("assistant","塔の最上階——悪の化身が実体を現した！\n\n「……ようやく来たか。覚悟はできているか？」\n\n最終決戦が始まった！","demon");
      return;
    }
    const boss=BATTLE_FLOORS[floor-1];
    setEnemyName(boss.name);setEnemyHP(boss.hp);setEnemyMaxHP(boss.hp);ehpRef.current=boss.hp;
    setGameState("boss");bgm.playBGM(floor>=2?"boss2":"battle");
    pushMsg("assistant",`【${floor}階】${["石像の番人が動き出した！","炎の魔術師が炎を放つ！","黒騎士が剣を構えた！","幻影の双子が現れた！","封印の守護者が覚醒した！"][floor-1]}`,"narrator");
  },[bgm,pushMsg]);

  const triggerMysteryEvent=useCallback(async()=>{
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,system:MYSTERY_PROMPT,messages:[{role:"user",content:"ランダムにイベントを1つ選んで描写してください。"}]})});
      const data=await res.json();
      const raw=data.content?.map(c=>c.text||"").join("")||"";
      const{voiceKey,cleanText}=parseVoice(raw);
      pushMsg("assistant",cleanText,voiceKey);
      setMysteryDone(true);
    }catch{}
  },[pushMsg]);

  const goToChapter=useCallback((idx)=>{
    if(idx>=CHAPTERS.length)return;
    setChapterIdx(idx);chIdxRef.current=idx;setTurnCount(0);turnRef.current=0;
    setShowIll(true);bgm.playBGM(CHAPTERS[idx].bgm);
    setTimeout(()=>{
      pushMsg("assistant",CH_INTRO[CHAPTERS[idx].id].text,CH_INTRO[CHAPTERS[idx].id].voice,true);
      setShowIll(false);
      if(CHAPTERS[idx].id==="ch4"&&!mysteryDone)setTimeout(()=>triggerMysteryEvent(),3000);
      if(CHAPTERS[idx].id==="ch5"){setCurrentFloor(1);floorRef.current=1;setTimeout(()=>triggerFloorBoss(1),3000);}
    },2800);
  },[bgm,pushMsg,mysteryDone,triggerMysteryEvent,triggerFloorBoss]);

  const doBattleTurn=useCallback(async(action)=>{
    setBattleLoading(true);
    const isFinal=gameState==="finalBoss";
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,system:BATTLE_PROMPT,
          messages:[{role:"user",content:`敵:${enemyName} HP:${ehpRef.current}/${enemyMaxHP} プレイヤーHP:${phpRef.current}/100 アクション:${action} 最終ボス:${isFinal} JSON形式で返答`}]})});
      const data=await res.json();
      const raw=data.content?.map(c=>c.text||"").join("")||"{}";
      const result=JSON.parse(raw.replace(/```json|```/g,"").trim());
      const newP=Math.max(0,phpRef.current-(result.playerDamage||0));
      const newE=Math.max(0,ehpRef.current-(result.enemyDamage||0));
      setPlayerHP(newP);setEnemyHP(newE);
      pushMsg("assistant",result.narrative||"戦闘が続く…",result.voice||"narrator");
      if((isFinal&&Math.random()<0.1)||result.urgent)setTimeout(()=>setUrgentMode(true),600);
      if(result.battleEnd==="win"||newE<=0){
        setTimeout(()=>{
          if(isFinal){setGameState("playing");bgm.playBGM("tower");pushMsg("assistant","悪の化身が崩れ落ちた……世界を覆っていた闇が晴れていく。あなたはどうする？","demon");}
          else{const next=floorRef.current+1;setCurrentFloor(next);floorRef.current=next;bgm.playBGM("tower");pushMsg("assistant",`${enemyName}を倒した！次の階へ進む……`,"narrator");setTimeout(()=>triggerFloorBoss(next),1500);}
        },500);
      }else if(result.battleEnd==="lose"||newP<=0){setTimeout(()=>{setGameState("gameover");bgm.stopAll();},500);}
      else if(result.battleEnd==="escape"){setTimeout(()=>{pushMsg("assistant","なんとか逃げ切った……","narrator");setGameState("playing");},500);}
    }catch{pushMsg("assistant","（戦闘エラー）","narrator");}
    setBattleLoading(false);setUrgentMode(false);
  },[gameState,enemyName,enemyMaxHP,pushMsg,bgm,triggerFloorBoss]);

  const handleUrgentTimeout=useCallback(()=>{
    setUrgentMode(false);const dmg=35;const newHP=Math.max(0,phpRef.current-dmg);setPlayerHP(newHP);
    pushMsg("assistant",`時間切れ！大技が直撃！ダメージ：${dmg}`,"demon");
    if(newHP<=0)setTimeout(()=>{setGameState("gameover");bgm.stopAll();},500);
  },[pushMsg,bgm]);

  const doNegotiate=useCallback(async(userMsg)=>{
    setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,system:NEGOTIATE_PROMPT,
          messages:[{role:"user",content:`プレイヤーの言葉:「${userMsg}」 交渉ターン:${negotiateCount+1}`}]})});
      const data=await res.json();
      const raw=data.content?.map(c=>c.text||"").join("")||"";
      const{voiceKey,cleanText}=parseVoice(raw);
      let res2=null,ft=cleanText;
      if(cleanText.includes("【NEGOTIATE:success】")){res2="success";ft=cleanText.replace("【NEGOTIATE:success】","").trim();}
      else if(cleanText.includes("【NEGOTIATE:partial】")){res2="partial";ft=cleanText.replace("【NEGOTIATE:partial】","").trim();}
      else if(cleanText.includes("【NEGOTIATE:fail】")){res2="fail";ft=cleanText.replace("【NEGOTIATE:fail】","").trim();}
      pushMsg("assistant",ft,voiceKey||"demon");
      setNegotiateCount(c=>c+1);
      if(res2==="success"){setTimeout(()=>{pushMsg("assistant","悪の化身が道を開いた……封印の祭壇へ向かうことができる。どうする？","demon");setGameState("playing");},1500);}
      else if((res2==="fail"&&negotiateCount>=1)||negotiateCount>=3){setTimeout(()=>{pushMsg("assistant","「言葉は無用だ！」","demon");setTimeout(()=>triggerFloorBoss(6),1000);},1000);}
    }catch{pushMsg("assistant","（エラー）","narrator");}
    setLoading(false);
  },[negotiateCount,pushMsg,triggerFloorBoss]);

  const startGame=()=>{
    setStarted(true);setShowIll(true);
    setTimeout(()=>{pushMsg("assistant",CH_INTRO["ch1"].text,CH_INTRO["ch1"].voice);setShowIll(false);},2500);
  };

  const sendMessage=async()=>{
    if(!input.trim()||loading||["ending","gameover"].includes(gameState))return;
    if(tw.typing){tw.skip();return;}
    if(gameState==="negotiate"){const m=input.trim();setInput("");pushMsg("user",m);doNegotiate(m);return;}
    const userMsg=input.trim();setInput("");
    setLoading(true);
    const curIdx=chIdxRef.current,curTurn=turnRef.current;
    pushMsg("user",userMsg);
    if(curIdx<=1&&isMoveWord(userMsg)&&Math.random()<(curTurn===0?0.85:0.45)){
      const mobs=["野盗","ゴブリン","迷子の魔獣"];
      const mob=mobs[Math.floor(Math.random()*mobs.length)];
      setEnemyName(mob);setEnemyHP(50);setEnemyMaxHP(50);ehpRef.current=50;
      setGameState("battle");bgm.playBGM("battle");
      setLoading(false);
      setTimeout(()=>pushMsg("assistant",`突然、${mob}が飛び出してきた！コマンドを選べ！`,"narrator"),400);
      return;
    }
    try{
      const newTurn=curTurn+1;setTurnCount(newTurn);turnRef.current=newTurn;
      const histApi=messages.filter(m=>!m.isSceneBreak).slice(-8).map(m=>({role:m.role,content:m.content}));
      const ctx=`[章:${curCh.label} 場所:${curCh.location} HP:${playerHP}/100 会話:${newTurn}/10]
プレイヤー:${userMsg}`;
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:makeStoryPrompt(curCh,newTurn),messages:[...histApi,{role:"user",content:ctx}]})});
      const data=await res.json();
      const raw=data.content?.map(c=>c.text||"").join("")||"…";
      let pt=raw,ending=null;
      ["justice","lone","dark","dream","random"].forEach(e=>{if(raw.includes(`【ENDING:${e}】`)){ending=e;pt=raw.replace(`【ENDING:${e}】`,"").trim();}});
      const nextCh=raw.includes("【NEXT_CHAPTER】");
      pt=pt.replace("【NEXT_CHAPTER】","").trim();

      // BGMタグ検知
      let bgmTag=null;
      if(pt.includes("【BGM:romance】")){bgmTag="romance";pt=pt.replace("【BGM:romance】","").trim();}
      else if(pt.includes("【BGM:spirit】")){bgmTag="spirit";pt=pt.replace("【BGM:spirit】","").trim();}
      else if(pt.includes("【BGM:chapter】")){bgmTag="chapter";pt=pt.replace("【BGM:chapter】","").trim();}
      if(bgmTag==="romance") bgm.playBGM("romance");
      else if(bgmTag==="spirit") bgm.playBGM("spirit");
      else if(bgmTag==="chapter") bgm.playBGM(CHAPTERS[chIdxRef.current]?.bgm||"village");

      const{voiceKey,cleanText}=parseVoice(pt);
      pushMsg("assistant",cleanText,voiceKey);
      if(ending){
        if(ending==="random"){
          fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,system:RANDOM_ENDING_PROMPT,messages:[{role:"user",content:"予想外のエンディングを生成してください。"}]})})
            .then(r=>r.json()).then(d=>setRandomEndingText(d.content?.map(c=>c.text||"").join("")||"")).catch(()=>{});
        }
        setTimeout(()=>{setGameState("ending");setEndingType(ending);bgm.stopAll();bgm.playBGM("ending");},1200);
      }else if(nextCh&&curIdx<CHAPTERS.length-1){setTimeout(()=>goToChapter(curIdx+1),1500);}
    }catch{pushMsg("assistant","（通信エラー）","narrator");}
    setLoading(false);setTimeout(()=>inputRef.current?.focus(),100);
  };

  const handleKey=(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}};

  const reset=()=>{
    setMessages([]);setInput("");setChapterIdx(0);chIdxRef.current=0;setTurnCount(0);turnRef.current=0;
    setGameState("playing");setEndingType(null);setRandomEndingText("");setStarted(false);setShowIll(false);
    setTypingMsgId(null);setPlayerHP(100);phpRef.current=100;setEnemyHP(0);setCurrentFloor(0);floorRef.current=0;
    setBossChoiceShown(false);setNegotiateCount(0);setAllyUsed(false);setMysteryDone(false);
    setUrgentMode(false);bgm.stopAll();tts.stop&&tts.stop();
  };

  const voiceIcon=(vk)=>vk==="spirit"?"🌿":vk==="demon"?"💀":"";

  const renderEnding=()=>{
    const e=ENDINGS[endingType]||ENDINGS.justice;
    const desc=endingType==="random"?randomEndingText:e.desc;
    return(<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0",gap:22}}>
      {messages.length>0&&<div style={{width:"100%",background:"#110e08",border:"1px solid #2a2010",borderRadius:3,padding:"16px 20px",fontSize:13,lineHeight:2,color:"#c8b898",maxHeight:160,overflowY:"auto",whiteSpace:"pre-wrap"}}>{messages[messages.length-1]?.content}</div>}
      <div style={{textAlign:"center",border:`1px solid ${e.color}30`,padding:"28px 34px",background:`${e.color}08`,width:"100%"}}>
        <div style={{fontSize:36,marginBottom:10}}>{e.icon}</div>
        <div style={{fontSize:10,letterSpacing:"0.3em",color:e.color,opacity:0.7,marginBottom:6,textTransform:"uppercase"}}>{e.sub}</div>
        <h2 style={{fontSize:20,color:e.color,margin:"0 0 12px",fontWeight:"normal"}}>{e.title}</h2>
        <p style={{fontSize:13,lineHeight:1.9,color:"#a09070",margin:0}}>{desc||"…"}</p>
      </div>
      <button onClick={reset} style={{padding:"11px 32px",background:"transparent",border:"1px solid #3a3020",color:"#8a7a5a",fontSize:12,letterSpacing:"0.2em",cursor:"pointer",fontFamily:"inherit"}}
        onMouseEnter={e=>e.target.style.borderColor="#7a6030"} onMouseLeave={e=>e.target.style.borderColor="#3a3020"}>もう一度プレイする</button>
    </div>);
  };

  return(<div style={{minHeight:"100vh",background:C.bg,position:"relative",fontFamily:"'Georgia','Palatino Linotype',serif",color:"#e8dfc8",display:"flex",flexDirection:"column",alignItems:"center"}}>
    {showSaved&&<SavedModal saved={savedScenes} onClose={()=>setShowSaved(false)} onDelete={deleteSaved}/>}
    {showIll&&started&&(
      <div style={{position:"fixed",inset:0,zIndex:50,background:"#08060a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"fadeInOut 3s ease forwards"}}>
        <div style={{width:"min(480px,90vw)",opacity:0.92}}><ChapterIll chId={CHAPTERS[chapterIdx]?.id}/></div>
        <div style={{marginTop:16,fontSize:12,letterSpacing:"0.25em",color:"#c8a870",textTransform:"uppercase"}}>{CHAPTERS[chapterIdx]?.label}</div>
      </div>
    )}
    <div style={{width:"100%",maxWidth:720,padding:"18px 20px 0"}}>
      <div style={{borderBottom:`1px solid ${C.border}`,paddingBottom:10,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:10,letterSpacing:"0.3em",color:"#6a5a3a",textTransform:"uppercase",marginBottom:3}}>Fantasy Gamebook · Altemia</div>
          <h1 style={{fontSize:20,fontWeight:"normal",margin:0,color:"#f0e0b0"}}>悪の化身の封印</h1>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {started&&<>
            <button onClick={()=>{const n=!bgmOn;setBgmOn(n);bgm.setEnabled(n);}} style={{background:"none",border:`1px solid ${bgmOn?"#5a4a2a":"#2a2010"}`,color:bgmOn?"#c8a870":"#3a3020",fontSize:10,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit",borderRadius:2}}>♪{bgmOn?"ON":"OFF"}</button>
            {!audioUnlocked&&<button onClick={unlockAudio} style={{background:"#2a1e08",border:"2px solid #d4a840",color:"#d4a840",fontSize:11,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",borderRadius:4,animation:"urgentPulse 1.5s infinite",minWidth:80,minHeight:36}}>🎵 音楽ON</button>}
            {apiKey&&<button onClick={()=>{const n=!voiceOn;setVoiceOn(n);tts.setEnabled&&tts.setEnabled(n);}} style={{background:"none",border:`1px solid ${voiceOn?"#5a4a2a":"#2a2010"}`,color:voiceOn?"#c8a870":"#3a3020",fontSize:10,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit",borderRadius:2}}>🔊{voiceOn?"ON":"OFF"}</button>}
            <button onClick={()=>setShowSaved(true)} style={{background:"none",border:`1px solid ${savedScenes.length>0?"#5a4a2a":"#2a2010"}`,color:savedScenes.length>0?"#c8a870":"#3a3020",fontSize:10,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit",borderRadius:2}}>🔖{savedScenes.length>0?` ${savedScenes.length}`:""}</button>
          </>}
        </div>
      </div>
      {started&&(<div style={{paddingBottom:10}}>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <HPBar label="HP" hp={playerHP} maxHp={100} color="#60a860"/>
          {isBattle&&<HPBar label={enemyName} hp={enemyHP} maxHp={enemyMaxHP} color="#c05050"/>}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {CHAPTERS.map((ch,i)=>(<div key={ch.id} style={{fontSize:10,padding:"2px 7px",border:`1px solid ${i<=chapterIdx?"#7a6030":"#2a2218"}`,background:i<chapterIdx?"#2a1e0a":i===chapterIdx?"#1e1608":"transparent",color:i<chapterIdx?"#8a7040":i===chapterIdx?"#d4a840":"#3a3020",transition:"all 0.4s"}}>{i<chapterIdx?"✓":i===chapterIdx?"▶":""} {ch.label.split("：")[1]||ch.label}</div>))}
          {chapterIdx===4&&currentFloor>0&&<div style={{fontSize:10,padding:"2px 7px",border:"1px solid #603020",background:"#1a0808",color:"#c06040"}}>{currentFloor>5?"最終ボス":`🏰${currentFloor}階`}</div>}
          {isBattle&&<div style={{fontSize:10,padding:"2px 7px",border:"1px solid #803020",background:"#200a0a",color:"#c05050",animation:"urgentPulse 1s infinite"}}>⚔️{gameState==="finalBoss"?"最終ボス":"戦闘中"}</div>}
          {gameState==="negotiate"&&<div style={{fontSize:10,padding:"2px 7px",border:"1px solid #204080",background:"#0a1020",color:"#4080c0"}}>🕊️交渉中</div>}
          {started&&<div style={{fontSize:10,padding:"2px 7px",border:"1px solid #2a2010",color:"#4a3a1a"}}>残{10-turnCount}回</div>}
        </div>
      </div>)}
    </div>
    <div style={{width:"100%",maxWidth:720,flex:1,padding:"0 20px",display:"flex",flexDirection:"column"}}>
      {apiKey===null?(<ApiKeySetup onSave={(k)=>handleSetApiKey(k)}/>)
      :!started?(<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0",gap:24}}>
        <div style={{width:"min(360px,85vw)",borderRadius:2,overflow:"hidden",opacity:0.85,border:"1px solid #2a1e10"}}><ChapterIll chId="ch5"/></div>
        <div style={{textAlign:"center",maxWidth:420}}>
          <h2 style={{fontSize:18,color:"#f0e0b0",fontWeight:"normal",margin:"0 0 12px",letterSpacing:"0.05em"}}>悪の化身の封印</h2>
          <p style={{fontSize:13,lineHeight:2.1,color:"#9a8a6a",margin:0}}>孤島に生まれた伝説——<br/>悪の化身の封印が今まさに解けようとしている。<br/>AIと会話しながら物語を紡ぎ、<br/>あなただけの結末を見つけよ。</p>
          <div style={{marginTop:14,fontSize:10,color:"#4a3a1a",letterSpacing:"0.12em"}}>✦ 全5章 ✦ ランダム戦闘 ✦ 謎の村 ✦ 5つのエンディング ✦</div>
        </div>
        <button onClick={startGame} style={{padding:"13px 44px",background:"transparent",border:"1px solid #7a6030",color:C.gold,fontSize:13,letterSpacing:"0.2em",cursor:"pointer",fontFamily:"inherit",transition:"all 0.3s"}}
          onMouseEnter={e=>{e.target.style.background="#1e1608";e.target.style.borderColor=C.gold}} onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.borderColor="#7a6030"}}>冒険を始める</button>
      </div>)
      :gameState==="gameover"?(<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 0",gap:20}}>
        <div style={{fontSize:40}}>💀</div>
        <h2 style={{fontSize:22,color:"#c05050",fontWeight:"normal",margin:0}}>Game Over</h2>
        <p style={{fontSize:13,color:"#6a4a4a",margin:0}}>力尽きて倒れた……</p>
        <button onClick={reset} style={{padding:"11px 32px",background:"transparent",border:"1px solid #5a2020",color:"#c05050",fontSize:12,letterSpacing:"0.2em",cursor:"pointer",fontFamily:"inherit"}}>もう一度挑戦する</button>
      </div>)
      :gameState==="ending"&&endingType?renderEnding()
      :(<>
        <div style={{flex:1,overflowY:"auto",padding:"14px 0",display:"flex",flexDirection:"column",gap:14,minHeight:280,maxHeight:"46vh"}}>
          {messages.map((msg)=>{
            const isLatest=msg.id===typingMsgId;
            const disp=(msg.role==="assistant"&&isLatest)?tw.displayed:msg.content;
            return(<div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:msg.role==="user"?"flex-end":"flex-start"}}>
              {msg.role==="assistant"?(<div style={{maxWidth:"92%"}}>
                {msg.voiceKey&&msg.voiceKey!=="narrator"&&<div style={{fontSize:10,color:msg.voiceKey==="spirit"?"#60a860":"#8050c0",marginBottom:3}}>{voiceIcon(msg.voiceKey)} {VOICES[msg.voiceKey]?.name}</div>}
                <div style={{fontSize:13,lineHeight:2.1,color:msg.isSceneBreak?"#d4a840":"#c8b898",whiteSpace:"pre-wrap",padding:msg.isSceneBreak?"12px 16px":"0",background:msg.isSceneBreak?"#1a1408":"transparent",border:msg.isSceneBreak?"1px solid #2a1e08":"none",borderRadius:2}}>
                  {disp}{isLatest&&tw.typing&&<span style={{animation:"blink 0.7s infinite",marginLeft:1}}>▍</span>}
                </div>
                <button onClick={()=>toggleSave(msg)} title={isSaved(msg.id)?"保存解除":"この場面を保存"}
                  style={{marginTop:3,background:"none",border:"none",cursor:"pointer",fontSize:14,opacity:isSaved(msg.id)?1:0.3,transition:"opacity 0.2s",padding:"2px 0",display:"block"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=isSaved(msg.id)?"1":"0.3"}>🔖</button>
              </div>)
              :(<div style={{fontSize:13,lineHeight:1.7,color:"#e8d8a8",background:"#1e1a10",border:"1px solid #3a3020",borderRadius:"2px 2px 0 2px",padding:"10px 16px",maxWidth:"76%"}}>{msg.content}</div>)}
            </div>);
          })}
          {(loading||battleLoading)&&<div style={{fontSize:13,color:"#5a4a2a",padding:"6px 0"}}><span style={{animation:"blink 1s infinite"}}>▌</span>{isBattle?"戦闘処理中…":"語りかけている…"}</div>}
          <div ref={bottomRef}/>
        </div>
        {!bossChoiceShown&&chapterIdx===4&&currentFloor>5&&gameState==="playing"&&(
          <div style={{display:"flex",gap:8,margin:"8px 0"}}>
            <button onClick={()=>{setBossChoiceShown(true);setGameState("negotiate");pushMsg("assistant","悪の化身が静かに振り返った。「……言葉で語るか。聞こう」","demon");}}
              style={{flex:1,padding:"12px 8px",background:"#0a1a0a",border:"1px solid #208040",color:"#40a060",fontSize:13,cursor:"pointer",fontFamily:"inherit",borderRadius:3}}>🕊️ 交渉する</button>
            <button onClick={()=>{setBossChoiceShown(true);triggerFloorBoss(6);}}
              style={{flex:1,padding:"12px 8px",background:"#1a0808",border:"1px solid #802020",color:"#c04040",fontSize:13,cursor:"pointer",fontFamily:"inherit",borderRadius:3}}>⚔️ 戦う</button>
          </div>
        )}
        {isBattle&&(<div style={{borderTop:"1px solid #2a2010",paddingTop:12,paddingBottom:18}}>
          {urgentMode&&<Countdown seconds={5} onTimeout={handleUrgentTimeout}/>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
            {[{key:"攻撃",label:"⚔️ 攻撃",color:"#c04020"},{key:"魔法",label:"✨ 魔法",color:"#4060c0"},{key:"防御",label:"🛡️ 防御",color:"#208040"},{key:"仲間技",label:"🤝 仲間技",color:"#c08020",disabled:allyUsed},{key:"逃げる",label:"💨 逃げる",color:"#606060"}]
            .map(c=>(<button key={c.key} onClick={()=>{if(!c.disabled){if(c.key==="仲間技")setAllyUsed(true);doBattleTurn(c.key);}}} disabled={battleLoading||c.disabled}
              style={{padding:"11px 8px",background:(battleLoading||c.disabled)?"#111008":`${c.color}18`,border:`1px solid ${(battleLoading||c.disabled)?"#2a2010":c.color}`,color:(battleLoading||c.disabled)?"#3a3020":c.color,fontSize:12,cursor:(battleLoading||c.disabled)?"default":"pointer",fontFamily:"inherit",borderRadius:3,transition:"all 0.2s",opacity:c.disabled?0.4:1}}>
              {c.label}{c.key==="仲間技"&&allyUsed?" (使用済)":""}
            </button>))}
          </div>
        </div>)}
        {!isBattle&&(<div style={{borderTop:"1px solid #2a2010",paddingTop:14,paddingBottom:18,display:"flex",gap:10,alignItems:"flex-end"}}>
          <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} disabled={loading}
            placeholder={tw.typing?"Enterで読み飛ばし…":gameState==="negotiate"?"悪の化身への言葉を入力…":"あなたの行動や言葉を入力… (Enterで送信)"} rows={2}
            style={{flex:1,background:"#110e08",border:"1px solid #3a3020",borderRadius:2,padding:"10px 14px",color:"#e8d8a8",fontSize:13,fontFamily:"inherit",resize:"none",outline:"none",lineHeight:1.7,transition:"border-color 0.2s"}}
            onFocus={e=>e.target.style.borderColor="#7a6030"} onBlur={e=>e.target.style.borderColor="#3a3020"}/>
          <button onClick={sendMessage} disabled={loading}
            style={{padding:"10px 18px",background:tw.typing?"#1a1206":(input.trim()&&!loading?"#2a1e08":"transparent"),border:`1px solid ${tw.typing?"#5a3a10":(input.trim()&&!loading?"#7a6030":"#2a2010")}`,color:tw.typing?"#b08030":(input.trim()&&!loading?C.gold:"#3a3020"),fontSize:12,cursor:loading?"default":"pointer",fontFamily:"inherit",transition:"all 0.2s",alignSelf:"stretch",minWidth:56}}>
            {tw.typing?"▶▶":"送る"}
          </button>
        </div>)}
      </>)}
    </div>
    <style>{`
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      @keyframes fadeInOut{0%{opacity:0}15%{opacity:1}75%{opacity:1}100%{opacity:0}}
      @keyframes urgentPulse{0%,100%{opacity:1}50%{opacity:0.6}}
      *{box-sizing:border-box}
      ::-webkit-scrollbar{width:3px}
      ::-webkit-scrollbar-track{background:#0d0b0f}
      ::-webkit-scrollbar-thumb{background:#2a2010;border-radius:2px}
    `}</style>
  </div>);
}
