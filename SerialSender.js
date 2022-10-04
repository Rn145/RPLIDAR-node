
class SerialSender{
	
	queue=[];
	has_freeze=false;
	
	timer=null;
	
	constructor(_serialport){
		this.serialport=_serialport;
	}
	
	send(_func){
		this.serialport.write(_func());
	}
	_send_next(){
		while(this.queue.length){
			let current=this.queue.shift();
			
			if(current[1]==0)
				this.send(current[0]);
			else{
				this.has_freeze=true;
				this.timer=setTimeout(()=>{
					this.send(current[0]);
					this.has_freeze=false;
				},current[1]);
				return;
			}
		}
	}
	add(_func,_freeze){
		
		this.queue.push([_func,_freeze]);
		
		if(this.queue.length==1 && !this.has_freeze)
			this._send_next();
	}
}

module.exports=SerialSender;