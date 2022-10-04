
var Thread=(_func,_interval=100)=>{
	
	let interval=_interval;
	let func=_func;
	let timer;
	
	let close=()=>{
		if(_timer)
			clearTimeout(_timer);
	}
	let setTimer=()=>{
		_timer=setTimeout(()=>{
			_timer=0;
			run();
		},interval);
	}
	let run=(...args)=>{
		close();
		setTimer();
		func(...args);
	}
	let toout=Object.assign(run,{
		close,
		get interval(){return interval},
		set interval(_v){return interval=_v},
		get func(){return func},
		set func(_f){return func=_f}
	});
	
	setTimer();
	
	return toout;
}

module.exports=Thread;