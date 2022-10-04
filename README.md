# RPLIDAR-node
Node.js Library for control SLAMTEC RPLIDAR for Raspberry Pi.

---
### Назначение 
Создан для прямого подключения Raspberry Pi к лидарам, в обход иных устройств.

Поддерживает подключение только через uart+pwm_pin.


---
### Особенности
Эта Node.js библиотека не использует официальный SDK от SLAMTEC, и основан на документации по RPLIDAR A2M8 и документации по протоколу интерфейса A и S серий лидаров.
  
Используются библиотеки PiGPIO, SerialPort и fs. Вы можете изменить код для работы с другой библиотекой контроля gpio портов, но желательно найти замену с реализацией Аппаратного шима. То же самое касается и библиотеки SerialPort. В PiGPIO уже есть инструменты для работы с serial портами, но было принято решение использовать библиотеку SerialPort для этого.
  
Библиотека сырая! Использовать с осторожностью, так как в ней не реализованы никакие проверки и защиты. Используйте только пе пины, на которых есть аппаратный шим!

---
### Использование
Каждый лидар является экземпляром класса RPLIDAR. Его конструктор принимает название serial порта и номер пина с шимом. Здесь Лидар был подклчен к `/dev/ttyAMA0` и к 18 пину.
```javascript
const RPLIDAR=require('./PRLIDAR');

const lidar=new RPLIDAR('/dev/ttyAMA0',18);

lidar.remove();
```

Начало сканирования. Задаём шим, после запускаем процесс сканирования, который возвращает функцию для регистрации нашей onscandata функции, в которую будут отправляться данные сканирования в реальном времени.
```javascript
const RPLIDAR=require('./PRLIDAR');

const lidar=new RPLIDAR('/dev/ttyAMA0',18);

const onscandata=(data)=>{
	console.log(data);
}

lidar.setPWM(0.6);
lidar.scan()(onscandata);

setTimeout(()=>{
	lidar.stop();
	lidar.setPWM(0);
	lidar.remove();
},1000*20);
```

Функции не запускающие потока данных возвращают промис.
```javascript
const RPLIDAR=require('./PRLIDAR');

const lidar=new RPLIDAR('/dev/ttyAMA0',18);

lidar.info().then((data)=>{
	console.log(data);
	lidar.remove();
});
```

Блокировка завершения программы. Пока лидар включен и он не удалён, программа не завершится даже если завершатся все таймеры и промисы. Это было сделано так как мы использовали собственную реализацию терминала с вводом.
```javascript
const RPLIDAR=require('./PRLIDAR');

const lidar=new RPLIDAR('/dev/ttyAMA0',18);

// конец скрипта
// программа не завершится.
```

---
### Методы
**new RPLIDAR(uart_device_name, opio_pin_name)**  
Возвращает **RPLIDAR**  
**string** uart_device_name - имя устройства uart_serial_port, к которому подключен лидар.  
**number** opio_pin_name - имя gpio пина с шимом, который подключен к лидару.  
Возвращает объект для управления лидаром.

**lidar.remove()**  
Останавливает лидар и разрывает uart подключение.  
Дальнейшее использование экземпляра лидара вызовет ошибки.

**RPLIDAR.getAll()**  
Возвращет **RPLIDAR\[\]**  
Возвращет массив всех действующих экземпляров лидаров.

**RPLIDAR.RemoveAll()**  
Останавливает лидар и разрывает uart подключение для всех лидаров.

**lidar.setPWM(fill_factor)**  
**number** fill_factor  
Устнавливает шим. fill_factor должен быть в диапазоне от 0 (без вращения) до 1 (максимальная скорость).  
Лидары имеет проверку стабильности вращения перед сканированием, по этому не рекомендуется устанавливать шим во время сканирования ниже 0.2 .

**lidar.stop()**  
Останаливает процесс сканирования.

**lidar.reset()**  
Перезапускает внутренний контроллер лидара.

**lidar.scan()**  
Возвращает **output_registration(onscandata)** - функция регистрации onscandata для возврата данных.  
Запускает процесс "стандартного" сканирования. Все данные о сканировании в реальном времени передаются в вашу функцию **onscandata**.

**lidar.scan()**  
Возвращает **output_registration(onscandata)** - функция регистрации onscandata для возврата данных.  
Запускает процесс "стандартного" сканирования. Все данные о сканировании в реальном времени передаются в вашу функцию **onscandata**.
Данные о сканирование представляют собой:
```
standart_scan_data{
	s: 0 | 1; // показатель нового оборота 360
	quality: number;
	angle: number;
	distance: number;
	name: 'scan';
}
```

**lidar.express_scan()**  
Возвращает **output_registration(onscandata)** - функция регистрации onscandata для возврата данных.  
Запускает процесс "быстрого сканирования" сканирования. Тип данных зависит от режима быстрого сканирования. Все данные о сканировании в реальном времени передаются в вашу функцию **onscandata**.
Данные о сканирование представляют собой:
```
express_scan_legacy{
	mode:'legacy';
	angle: number;
	cabins: {
		distance1: number;
		distance2: number;
		ad1: number;
		ad2: number;
	}[16];
	name: 'express_scan'
}

express_scan_dense{
	mode:'dense';
	angle: number;
	distances: number[40];
	name: 'express_scan'
}

express_scan_extended{
	не поддерживается
}
```

**lidar.force_scan()**
Возвращает **output_registration(onscandata)** - функция регистрации onscandata для возврата данных.  
Запускает процесс "стандартного" сканирования без проверки стабильности скорости вращения. Все данные о сканировании в реальном времени передаются в вашу функцию **onscandata**.
Данные о сканирование представляют собой:
```
standart_scan_data{
	s: 0 | 1; // показатель нового оборота 360
	quality: number;
	angle: number;
	distance: number;
	name: 'scan';
}
```

**lidar.info()**  
Возвращает промис **info_data**  
Запрашивает у лидара данные о себе.  
ID модели, Версию прошивки, Версию аппаратной части и серийный номер.
```
info_data{
	id: number;
	f_version: number;
	h_version: number;
	serialnumber: string; может быть не верным.
	name: 'get_info';
}
```

**lidar.health()**
Возвращает промис **health_data**  
Запрашивает у лидара данные о текущем состоянии.  
```
health_data{
	status: 'good' | 'warning' | 'error' | undefined;
	error_code: number;
	name: 'get_health';
}
```

**lidar.samplerate()**
Возвращает промис **samplerate_data**  
Запрашивает у лидара данные о периодах одного сканирования в разных режимах **в микросекундах**.
```
samplerate_data{
	standart: number;
	express: number;
	name: 'get_samplerate';
}
```

**lidar.record=true/false**  
Запускает/останавливает передачу всех принятых по uart данных в файл `dumbs/Lidar streamdumb.bin` в папке библиотеки.

**lidar.onbytes=callback**  
Событие приёма данных по uart.  
НЕ УКАЗЫВАТЬ undefuned!  
Передаёт **Buffer**.

**lidar.ondata=callback**  
Событие расшифровки данных из uart.  
НЕ УКАЗЫВАТЬ undefuned!  
Передаёт **standart_scan_data | express_scan_legacy | express_scan_dense | express_scan_extended | info_data | health_data | samplerate_data**

ПРЕДУПРЕЖДЕНИЕ: Порт потока данных лишь один на все виды сканирования, использовав ниже указанные функции вы переопредилите поток данных о сканированиях.

**lidar.port.output_registration(onscandata)**  
Регистрирует onscandata для возврата данных о сканировании.  
Именно эта функция возвращается всеми методами, запускающими сканирование!  

**lidar.port.output_unregistration()**  
Отменяет регистрацию onscandata.






