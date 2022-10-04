
let constrain=(_v,_min,_max)=> Math.max(Math.min(_v,_max),_min);
constrain.create=(_min,_max)=>((_v)=>Math.max(Math.min(_v,_max),_min));
constrain.zero_one=(_v)=>Math.max(Math.min(_v,1),0);

module.exports=constrain