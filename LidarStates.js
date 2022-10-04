const calcCheckSum = require('./calcCheckSum.js');

LidarStates={};

LidarStates.stop={
	name:'stop',
	is_response: false,
	request_is_function: false,
	request: [0xA5,0x25],
	freeze: 1,
},
LidarStates.reset={
	name:'reset',
	is_response: false,
	next_state: LidarStates.stop,
	request_is_function: false,
	request: [0xA5,0x40],
	freeze: 2
},
LidarStates.get_info={
	name:'get_info',
	is_response: true,
	is_stream: false,
	next_state: LidarStates.stop,
	request_is_function: false,
	request: [0xA5,0x50],
	freeze: 0,
	descriptor: [0x14,0x00,0x00,0x00,0x04],
	response_exe: (lidar,bytes)=>{
		return {
			id:           bytes[0],
			f_version:    bytes[1]/100+bytes[2],
			h_version:    bytes[3],
			serialnumber: bytes.slice(4).map(e=>e.toString(16)).join('')
		}
	}
},
LidarStates.get_health={
	name:'get_health',
	is_response: true,
	is_stream: false,
	next_state: LidarStates.stop,
	request_is_function: false,
	request: [0xA5,0x52],
	freeze: 0,
	descriptor: [0x03,0x00,0x00,0x00,0x06],
	response_exe: (lidar,bytes)=>{
		return {
			status:       (bytes[0]==0? 'good': (bytes[0]==1? 'warning': (bytes[0]==2? 'error': undefined))),
			error_code:   bytes[1]|(bytes[2]<<8)
		}
	}
},
LidarStates.get_samplerate={
	name:'get_samplerate',
	is_response: true,
	is_stream: false,
	next_state: LidarStates.stop,
	request_is_function: false,
	request: [0xA5,0x59],
	freeze: 0,
	descriptor: [0x04,0x00,0x00,0x00,0x15],
	response_exe: (lidar,bytes)=>{
		return {
			standart: bytes[0]|(bytes[1]<<8),
			express:  bytes[2]|(bytes[3]<<8)
		}
	}
},
LidarStates.scan={
	name:'scan',
	is_response: true,
	is_stream: true,
	request_is_function: false,
	request: [0xA5,0x20],
	freeze: 0,
	descriptor: [0x05,0x00,0x00,0x40,0x81],
	response_exe: (lidar,bytes)=>{
		let s=  bytes[0]&1;
		let ns=(bytes[0]&2)>>1;
		let c=  bytes[1]&1;
		if(s == ns || c==0)
			return false;
		
		let quality=   bytes[0]>>2;
		let angle=   ((bytes[1]>>1)|(bytes[2]<<7))/64;
		let distance= (bytes[3]|(bytes[4]<<8))/4;
		
		return {
			s,
			quality,
			angle,
			distance
		}
	}
},
LidarStates.express_scan_legacy={
	name:'express_scan',
	is_response: true,
	is_stream: true,
	request_is_function: false,
	request: [0xA5, 0x82, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x22],
	freeze: 0,
	descriptor: [0x54,0x00,0x00,0x40,0x82],
	response_exe: (lidar,bytes)=>{
		let sync1=  bytes[0]>>4; //0x0A
		let sync2=  bytes[1]>>4; //0x05
		let chksum= (bytes[0]&15)|((bytes[1]&15)<<4);
		
		if(sync1!=0x0A || sync2!=0x05 || false)
			return false;
		
		let angle=  (bytes[2]|((bytes[3]&127)<<8))/64;
		let s=      bytes[3]>>7;
		let cabins= [];
		
		for(let i=4,l=bytes.length; i<l; i+=5)
			cabins.push({
				distance1: (bytes[i+0]>>2)|(bytes[i+1]<<6),
				distance2: (bytes[i+2]>>2)|(bytes[i+3]<<6),
				ad1: ((bytes[i+4]&15)|((bytes[i+0]&3)<<4))/8,
				ad2: ((bytes[i+4]>>4)|((bytes[i+2]&3)<<4))/8,
			});
		
		return {
			mode:'legacy',
			angle,
			cabins
		}
	}
},
LidarStates.express_scan_dense={
	name:'express_scan',
	is_response: true,
	is_stream: true,
	request_is_function: false,
	request: [0xA5, 0x82, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x22],
	freeze: 0,
	descriptor: [0x54,0x00,0x00,0x40,0x85],
	response_exe: (lidar,bytes)=>{
		let sync1=  bytes[0]>>3; //0x0A
		let sync2=  bytes[1]>>3; //0x05
		let chksum= (bytes[0]&0x07)|((bytes[1]&0x07)<<3);
		
		if(sync1!=0x0A || sync2!=0x05 || false)
			return;
		
		let angle=  (bytes[3]|(bytes[4]>>1))/64;
		let s=      bytes[4]>>7;
		let distances= [];
		
		for(let i=5,l=bytes.length; i<l; i+=2)
			distances.push(bytes[i+0]|(bytes[i+1]<<8));
		
		return {
			mode:'dense',
			s,
			angle,
			distances
		}
	}
},
LidarStates.force_scan={
	name:'force_scan',
	is_response: true,
	is_stream: true,
	next_state: LidarStates.stop,
	request_is_function: false,
	request: [0xA5,0x21],
	freeze: 0,
	descriptor: LidarStates.scan.descriptor,
	response_exe: LidarStates.scan.response_exe
}

let configuration_types={
	modes_count:{
		code: 0x70,
		payload: 0,
		length: 2,
		response_exe: (lidar,bytes)=>{
			return {
				count: bytes[0]|(bytes[0]<<8)
			}
		}
	},
	samplerate:{
		code: 0x71,
		payload: 2,
		length: 4,
		response_exe: (lidar,bytes)=>{
			return {
				time: (bytes[0]|(bytes[0]<<(8*1))|(bytes[0]<<(8*2))|(bytes[0]<<(8*3)))/64
			}
		}
	},
	max_distance:{
		code: 0x74,
		payload: 2,
		length: 4,
		response_exe: (lidar,bytes)=>{
			return {
				distance_meters: (bytes[0]|(bytes[0]<<(8*1))|(bytes[0]<<(8*2))|(bytes[0]<<(8*3)))/64
			}
		}
	},
	answer_types:{
		code: 0x75,
		payload: 2,
		length: 1,
		response_exe: (lidar,bytes)=>{
			let t=bytes[0];
			return {
				type: (t==0x81? 'standart': (t==0x82? 'express': (t==0x83? 'boost/stability/sensetivity': undefined)))
			}
		}
	},
	typical_mode:{
		code: 0x7C,
		payload: 0,
		length: 2,
		response_exe: (lidar,bytes)=>{
			return {
				mode_id: bytes[0]|(bytes[0]<<8)
			}
		}
	},
	name:{
		code: 0x7F,
		payload: 2,
		length: 255,
		response_exe: (lidar,bytes)=>{
			let index=bytes.indexOf(0);
			if(~index)
				bytes=bytes.slice(index);
			
			return {
				name: bytes.map(e=>String.fromCharCode(e)).join('')
			}
		}
	}
}
LidarStates.get_configuration={
	name:'get_configuration',
	is_response: true,
	is_stream: true,
	next_state: LidarStates.stop,
	request_is_function: true,
	request: (name,...data)=>{
		
		let type=configuration_types[name];
		
		if(!type)
			return;
		
		let t=type.code;
		let typeCode=[t,t,t,t].map((e,i)=>e&(0xFF<<(8*i)));
		
		let request=[0xA5,0x84].concat([type.length]).concat(typeCode).concat(data);
		LidarStates.get_configuration.descriptor[0]=type.length;
		LidarStates.get_configuration.response_exe=type.response_exe;
		return request.concat(calcCheckSum(request));
	},
	freeze: 0,
	descriptor: [0x00,0x00,0x00,0x00,0x20],
	response_exe: ()=>{}
}

module.exports=LidarStates;