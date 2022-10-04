
const deleteElementFrom=require('./deleteElementFrom.js')

var Port=()=>{
	let output;

	let throw_data=(...data)=>(output && output(...data),undefined);

	let register=(_output)=>(output=_output,undefined);
	let unregister=()=>(output=undefined);
	
	return {
		send: throw_data,
		output_registration: register,
		output_unregistration: unregister
	}
}
Port.multy=()=>{
	let outputs=[];

	let throw_data=(...data)=>(outputs.forEach(e=>e(...data)),undefined);

	let register=(_output)=>(outputs.push(_output),undefined);
	let unregister=(_output)=>(deleteElementFrom(outputs,_output));

	return {
		send: throw_data,
		output_registration: register,
		output_unregistration: unregister,
	}
}

module.exports=Port;