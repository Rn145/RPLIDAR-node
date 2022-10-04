const SerialSender = require('./SerialSender.js');
const LidarStates  = require('./LidarStates.js');
const {SerialPort} = require('serialport');
const constrain    = require('./constrain.js');
const Thread       = require('./Thread.js');
const PiGPIO       = require('pigpio');
const Port         = require('./Port.js');
const PID          = require('./PID.js');
const fs           = require('fs');


const interval   = setInterval(()=>{}, 1000*60*60);
const GPIO       = PiGPIO.Gpio;


let Lidars = [];

class RPLIDAR{
	
	static getAllLifeLidars(){
		return Lidars.slice();
	}
	constructor(uart, pwm_pin){
		
		this._pwm = new GPIO(pwm_pin, {mode: GPIO.OUTPUT});
		this._state=null;
		this._verify_state=false;
		
		this.ondata=()=>{};
		this.onbytes=()=>{};
		this._to_return=()=>{};
		
		this.port = Port();
		
		this._record=false;
		this._Precord=false;
		
		this._record_stream;
		
		this._serialport = new SerialPort({ path: uart, baudRate: 115200});
		this.sender=new SerialSender(this._serialport);
		this._serialport.on('data', this._bytes_reader.bind(this));
		
		this.setPWM(0);
		this.reset();
		
		Lidars.push(this);
	}
	
	set record(_v){
		if(_v)
			this._record_stream=fs.createWriteStream('./dumbs/Lidar streamdumb.bin');
		else if(this._record_stream)
			this._record_stream.end();
		this._record=_v;
	}
	get record(){
		return this._record;
	}
	
	set sync_mode(_v){
		this._sync_mode=!!_v;
	}
	get sync_mode(){
		return this._sync_mode;
	}
	
	_serial_buffer=[];
	_bytes_reader(_bytes){
		if(this._record){
			this._record_stream.write(_bytes);
			this._Precord=this._record;
		}
		this._serial_reader(_bytes);
		this.onbytes(_bytes);
	}
	_serial_reader(data){
		this._serial_buffer=this._serial_buffer.concat(Array.from(data));
		
		if(!this._state?.is_response){
			this._serial_buffer=[];
			return;
		}
		
		while(true){
			if(this._verify_state)
				if(this._serial_buffer.length>=this._state.descriptor[0])
					this._process_package();
				else
					break;
			else if(!this._process_descriptor()){
				this._serial_buffer=this._serial_buffer.slice(-6);
				break;
			}
		}
		
	}
	_process_package(){
		let l=this._state.descriptor[0];
		let data=this._serial_buffer.slice(0,l);
		
		let answer=this._state.response_exe(this,data);
		if(answer){
			this._serial_buffer=this._serial_buffer.slice(l);
			answer.name=this._state.name;
			this._to_return(answer);
			this.ondata(answer);
			if(this._state.is_stream)
				this.port.send(answer);
		}
		else
			this._serial_buffer=this._serial_buffer.slice(1);
		
		if(!this._state.is_stream){
			this._state=this._state.next_state;
			this._verify_state=false;
		}
	}
	_process_descriptor(){
		
		function search_descriptor(arr){
			let l=arr.length-1;
			let i=0;
			for(; i<l && !(arr[i]==0xA5 && arr[i+1]==0x5A); i++);
			return (i>l-6? -1: i);
		}
		
		let input_descriptor_index=search_descriptor(this._serial_buffer);
		if(~input_descriptor_index){
			let input_descriptor=this._serial_buffer.slice(input_descriptor_index+2,input_descriptor_index+7);
			this._serial_buffer=this._serial_buffer.slice(input_descriptor_index+7);
			
			if(this._state.descriptor.every((e,i)=>e==input_descriptor[i]))
				return this._verify_state=true;
			else{
				
				let input_destriptor_name=Object.keys(LidarStates)
					.filter(e=>LidarStates[e].name==this._state.name && LidarStates[e]!=this._state)
					.find(e=>LidarStates[e].descriptor && LidarStates[e].descriptor.every((e,i)=>e==input_descriptor[i]));
				
				if(input_destriptor_name){
					this._state=LidarStates[input_destriptor_name];
					return this._verify_state=true;
				}
			}
		}
		return false;
	}
	
	_send(_state,...args){
		let freeze=_state.freeze ?? 0;
		
		let request=(_state.request_is_function? _state.request(...args): _state.request);
		
		if(!request)
			throw Error('Request is incorrect');
		
		let request_func=(()=>{
			if(!_state.is_response)
				this._state=_state.next_state;
			else
				this._state=_state;
			this._verify_state=false;
			
			return request;
		}).bind(this);
		
		this.sender.add(request_func, freeze);
		
		if(_state.is_response)
			if(_state.is_stream)
				return this.port.output_registration;
			else
				return new Promise((succ,fail)=>{
					this._to_return=(data)=>{
						this._to_return=()=>{};
						succ(data);
					}
				});
		
	}
	
	
	static RemoveAll(){
		Lidars.forEach(e=>e.remove());
		clearInterval(interval);
	}
	remove(){
		let index = Lidars.indexOf(this);
		if(~index)
			Lidars.splice(index);
		this.setPWM(0);
		this.stop();
	}
	
	setPWM(_value){
		_value=constrain.zero_one(_value,0,1);
		this._pwm.hardwarePwmWrite(25000,1000000*_value);
	}
	
	stop(){ //остановка текущего процесса
		return this._send(LidarStates.stop);
	}
	reset(){ //перезапуск лидара
		return this._send(LidarStates.reset);
	}
	scan(){ //начало процесса сканирования
		return this._send(LidarStates.scan);
	}
	express_scan(){ //начало процесса сканирования на максимальной скорости
		return this._send(LidarStates.express_scan_dense);
	}
	force_scan(){ //немедленное сканирование без проверки скорости
		return this._send(LidarStates.force_scan);
	}
	info(){ //информация о лидаре
		return this._send(LidarStates.get_info);
	}
	health(){ //информация о состоянии лидара
		return this._send(LidarStates.get_health);
	}
	samplerate(){ //время одного семпла
		return this._send(LidarStates.get_samplerate);
	}
	configuration(name,...data){ //возвращает конфигурацию лидара
		return this._send(LidarStates.get_configuration,name,...data);
	}
}
module.exports = RPLIDAR;

