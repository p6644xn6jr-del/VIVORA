import eggImage from "../assets/egg.png";
import latteImage from "../assets/latte.png";
import bentoImage from "../assets/bento.png";

// APIレスポンスを想定した仮データ。画面側には直接書かない。
export const mockCurrentUser = {
  id: 1,
  name: "たいが",
  icon: "🥚",
  area: "愛知県",
  title: "挑戦者",
  joinedContestIds: [1, 5, 7],
  followingUserIds: [2, 4],
};

export const mockContests = [
  {id:1,title:"第1回 目玉焼き 最円王決定戦",description:"最も丸い目玉焼きを決める。",image:eggImage,status:"active",category:"料理",official:true,participants:824,remainingText:"あと3日",myBestScore:97.2,ranking:12,rule:"写真を投稿して、最も丸い目玉焼きを競います。"},
  {id:2,title:"コーヒー温度王",description:"最高の一杯を極める温度の達人を決める。",image:latteImage,status:"active",category:"コーヒー",official:true,participants:642,remainingText:"あと8日",myBestScore:null,ranking:null,rule:"自分が最高だと思う抽出温度を投稿して競います。"},
  {id:3,title:"ジャスト1,000秒選手権",description:"1,000秒ぴったりを目指せ。",image:bentoImage,status:"active",category:"チャレンジ",official:true,participants:1234,remainingText:"あと5日",myBestScore:null,ranking:null,rule:"ストップウォッチなどを使って1,000秒を目指します。"},
  {id:4,title:"早口王決定戦",description:"誰よりも速く、正確に言葉を言い切ろう！",image:eggImage,status:"active",category:"チャレンジ",official:false,participants:512,remainingText:"あと6日",myBestScore:null,ranking:null,rule:"指定された文章をできるだけ速く正確に読み上げます。"},
  {id:5,title:"パンケーキ積み上げ",description:"パンケーキをどこまで高く積み上げられる？",image:latteImage,status:"active",category:"料理",official:false,participants:438,remainingText:"あと6日",myBestScore:91.8,ranking:34,rule:"崩さずに積み上げた高さを競います。"},
  {id:6,title:"オムライス包み王",description:"きれいなオムライスを作って競おう！",image:bentoImage,status:"active",category:"料理",official:false,participants:367,remainingText:"あと4日",myBestScore:null,ranking:null,rule:"見た目・包み方などを基準に競います。"},
  {id:7,title:"ポテチ早食いバトル",description:"ポテチを最速で食べきるのは誰だ！",image:eggImage,status:"active",category:"チャレンジ",official:false,participants:456,remainingText:"あと4日",myBestScore:89.7,ranking:51,rule:"指定された量を食べきるまでのタイムを競います。"},
  {id:8,title:"朝ごはん満足度選手権",description:"最高の朝ごはんを考えて投稿しよう。",image:eggImage,status:"active",category:"料理",official:false,participants:301,remainingText:"あと10日",myBestScore:null,ranking:null,rule:"朝ごはんの写真とこだわりを投稿します。"},
  {id:9,title:"冷蔵庫の中身だけ料理王",description:"家にあるものだけで最高の一皿を作ろう。",image:bentoImage,status:"active",category:"料理",official:false,participants:278,remainingText:"あと12日",myBestScore:null,ranking:null,rule:"冷蔵庫にある食材だけを使用します。"},
  {id:10,title:"利き水選手権",description:"水の違いを見抜けるか。",image:latteImage,status:"active",category:"チャレンジ",official:false,participants:198,remainingText:"あと11日",myBestScore:null,ranking:null,rule:"複数の水を飲み比べて回答します。"},
  {id:11,title:"秋の味覚先取り選手権",description:"秋っぽい一品を先取りして投稿。",image:bentoImage,status:"upcoming",category:"料理",official:true,participants:0,remainingText:"9月5日開始",myBestScore:null,ranking:null,rule:"秋の味覚を使った料理を投稿します。"},
  {id:12,title:"一週間コーヒー記録",description:"7日間のコーヒー習慣を記録しよう。",image:latteImage,status:"upcoming",category:"コーヒー",official:false,participants:0,remainingText:"9月8日開始",myBestScore:null,ranking:null,rule:"7日間の記録を投稿します。"},
];

export const mockTags = [
  [1,"目玉焼き","12.3万件","🥚"],[2,"コーヒー","8.7万件","☕"],[3,"1,000秒","5.4万件","⏱️"],[4,"パンケーキ","4.9万件","🥞"],[5,"オムライス","4.1万件","🍳"],[6,"ポテチ","3.6万件","🥔"],[7,"朝ごはん","3.3万件","🍞"],[8,"自炊","2.9万件","🍳"]
].map(([id,name,postCountText,emoji],i)=>({id,name,postCountText,emoji,rank:i+1,postCount:0}));

export const mockPosts = [
  {id:1,userId:2,userName:"たまご大好き",userIcon:"🥚",createdAtText:"3時間前",image:eggImage,text:"目玉焼きの黄身は真ん中じゃないと落ち着かない。",tags:["目玉焼き"],likes:1245,comments:128},
  {id:2,userId:4,userName:"珈琲時間",userIcon:"☕",createdAtText:"5時間前",image:latteImage,text:"朝の一杯はハンドドリップが欠かせない。",tags:["コーヒー"],likes:892,comments:96},
  {id:3,userId:5,userName:"ストップウォッチ好き",userIcon:"⏱️",createdAtText:"1日前",image:eggImage,text:"1,000秒ぴったりを出すのが快感。",tags:["1,000秒"],likes:736,comments:74},
  {id:4,userId:6,userName:"朝食研究家",userIcon:"🍳",createdAtText:"1日前",image:eggImage,text:"白身はしっかり、黄身はとろーり半熟が最高。",tags:["目玉焼き"],likes:681,comments:52},
  {id:5,userId:7,userName:"料理好き",userIcon:"👨‍🍳",createdAtText:"2日前",image:eggImage,text:"ごま油でカリッと焼くのがマイルール。",tags:["目玉焼き"],likes:592,comments:41},
  {id:6,userId:8,userName:"パンケーキ職人",userIcon:"🥞",createdAtText:"2日前",image:latteImage,text:"高さと焼き色、どっちも妥協しない。",tags:["パンケーキ"],likes:488,comments:39},
];
