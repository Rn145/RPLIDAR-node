
const constrain=require('./constrain.js');

var PID=(_p,_i,_d,_min,_max)=>{
	let I=0;
	let pP=0;
	let c=constrain.create(_min,_max);
	return (_real,_target,_t)=>{
		let P=_target-_real;
		let D=(P-pP)/_t;
		I=c(I + err*_t*_i);
		pP=P;
		return c(P*_p + I + D*_d);
	}
}
PID.unlock=()=>{
	let I=0;
	let pP=0;
	return (_real,_target,_t,_p,_i,_d,_min,_max)=>{
		let P=_target-_real;
		let D=(P-pP)/_t;
		I=constrain(I + err*_t*_i, _min,_max);
		pP=P;
		return constrain(P*_p + I + D*_d, _min,_max);
	}
}

module.exports=PID;