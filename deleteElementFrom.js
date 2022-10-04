
var deleteElementFrom=(_array,_element)=>{
	let index=_array.indexOf(_element);
	if(~index)
		return (_array.splice(index,1)),true;
	return false;
}

module.exports=deleteElementFrom;