#MKOA简易安装模块

自动安装模块的NPM依赖包、导入/删除ORM模型的数据表、执行额外sql文件

>直接复制模块文件到模块目录

>访问 域名+install/index 可以对MKoa模块进行管理

需要额外安装卸载的Mkoa模块，可以在模块增加install/config.json文件夹/文件
config.json配置字段

带有数据模型或者npm依赖的模块即便没有install/config.json,系统会自动生成
```js
{
name:'模块名称',
author:'作者',
description：'模块简介',
folder:'模块标识'，//文件夹名
version：'版本号'，
type:0,//0:不需要卸载安装 1可以卸载  2可以安装
dependencies:[],//依赖的其他Mkoa模块标识
installFile:'install.sql',安装执行的sql文件，与config.json统一目录
uninstallFile:'uninstall.sql'
}
```
安装卸载sql文件支持变量[$prefix]执行时将统一替换成配置的数据表前缀


