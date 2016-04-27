/**
 * Created by megic on 2016/3/24 0024.
 */
module.exports = function ($this) {
    var main = {};
    var fs=require('fs'),
    fscp = require('co-fs-plus');//文件夹等操作
    main['_init'] = function *() {//先执行的公共函数
        //console.log('公共头部');
    };
    main['_after'] = function *() {//后行的公共函数
        //console.log('公共头部');
    };
     //main['shell']=function *(){//执行shell
     //    var cprocess = require('child_process');
     //    cprocess.execSync($this.POST['code'],{cwd:$C.ROOT});//设置安装源
     //    $this.success();
     //};
    //****************************
    main['list'] = function *() {
        var moudelList = fs.readdirSync($C.application);
        var res=[];
        moudelList.forEach(function(item){
            var config;
            var json=$C.ROOT+'/'+$C.application+'/'+item+'/install/config.json';
            if(fs.existsSync(json)){//存在安装描述文件
                config=JSON.parse(fs.readFileSync(json, 'utf8'));
            }else{
                config={
                    name:item,
                    type:fs.existsSync($C.ROOT+'/'+$C.application+'/'+item+'/models/')?2:0  //存在模型文件夹标记为需安装
                }
            }
            config.folder=item;
            res.push(config);
        });
        $this.body=res;

    };//****************************
    main['install'] = function *() {
        var folder=$this.POST['folder'];
        var appPath=$C.ROOT+'/'+$C.application+'/'+folder;//模块目录
        var installPath=appPath+'/install/';
        var configFile=appPath+'/install/config.json';//配置文件地址
        var modelPath=appPath+'/models/';//模型文件地址
        var config;
        if(fs.existsSync(configFile)){//如果安装配置文件存在
            config=JSON.parse(fs.readFileSync(configFile, 'utf8'));
        }else{
            config={
                name:folder,
                folder:folder,
                type:2
            }
        }
//判断依赖模块是否已经安装
        var uninstallMoudel=[];
        if(config.dependencies){
            config.dependencies.forEach(function(item){
                var aPth=$C.ROOT+'/'+$C.application+'/'+item;
                if(fs.existsSync(aPth)) {//如果存在模块
                    if(fs.existsSync(aPth+'/install/config.json')){//是否存在配置文件
                        var itemconfig=JSON.parse(fs.readFileSync(aPth+'/install/config.json', 'utf8'));//读取配置文件
                        if(itemconfig.type==2)uninstallMoudel.push(item);
                    }else{
                        fs.existsSync(aPth+'/models/')|| uninstallMoudel.push(item);
                    }
                }else{
                    uninstallMoudel.push(item);
                }
            });
        }
        if(uninstallMoudel.length){//如果存在未安装的依赖
            $this.error('需先安装依赖:'+uninstallMoudel.join('、'));
        }else {
            if (config.type == 2) {//可安装
                //安装模型，生成数据表
                if (fs.existsSync(modelPath)) {//存在模型文件
                    var models = fs.readdirSync(modelPath);
                    var makArr = [];
                    models.forEach(function (item) {//循环
                        var nameArr = item.split('.');
                        $SYS.modelPath[nameArr[0]] = modelPath + item;
                        makArr.push($D(nameArr[0]).sync({force: true}));
                    });
                    yield makArr;//执行并发
                }
                //判断是否需要安装依赖包
                if(fs.existsSync(appPath+'/package.json')) {//如果存在依赖模块
                    var cprocess = require('child_process');
                    cprocess.execSync('npm config set registry http://registry.npm.taobao.org/',{cwd: appPath + '/'});//设置安装源
                    cprocess.execSync('npm install',{cwd: appPath + '/'});//执行npm安装
                }

                //执行额外的sql文件
                if (!config.installFile)config.installFile = 'install.sql';//默认执行文件
                var sqlPath = appPath + '/install/' + config.installFile;//安装文件
                if (fs.existsSync(sqlPath)) {//存在数据库安装文件,执行sql安装
                    var sql = fs.readFileSync(sqlPath).toString();
                    sql = replaceFix(sql);//替换数据前缀
                    yield $SYS.sequelize.query(sql);//执行操作
                }
                config.type = 1;//修改记录状态
                if (fs.existsSync(installPath) || (yield fscp.mkdirp(installPath, '0755'))) {//判定文件夹是否存在
                    fs.writeFileSync(configFile, JSON.stringify(config));//修改配置文件
                }
                $this.success();
            } else {
                $this.error();
            }
        }
    };

    main['uninstall'] = function *() {
        var folder=$this.POST['folder'];
        var appPath=$C.ROOT+'/'+$C.application+'/'+folder;//模块目录
        var installPath=appPath+'/install/';
        var configFile=appPath+'/install/config.json';//配置文件地址
        var modelPath=appPath+'/models/';//模型文件地址
        var config;
        if(fs.existsSync(configFile)){//如果安装配置文件存在
            config=JSON.parse(fs.readFileSync(configFile, 'utf8'));
        }else{
            config={
                name:folder,
                folder:folder,
                type:1
            }
        }
        if(config.type==1){
        if(fs.existsSync(modelPath)) {//存在模型文件
            var models = fs.readdirSync(modelPath);
            var makArr=[];
            models.forEach(function(item){//循环
                var nameArr=item.split('.');
                var modelName=nameArr[0];
                var tableNmae=$D(modelName).getTableName();//数据表名
                $SYS.modelPath[tableNmae]=null;
                delete  $SYS.modelPath[tableNmae];//删除内存模型记录
                makArr.push($SYS.sequelize.query('drop table "'+tableNmae+'";'));//删除数据表语句
            });
            yield makArr;//执行并发
        }
            //判断是否需要安装依赖包
            if(fs.existsSync(appPath+'/package.json')) {//如果存在依赖模块
                var cprocess = require('child_process');
                cprocess.execSync('rm -rf node_modules',{cwd: appPath + '/'});//删除依赖文件夹
            }

        if(!config.uninstallFile)config.uninstallFile='uninstall.sql';//默认执行文件
        var sqlPath=appPath+'/install/'+config.uninstallFile;//卸载文件
        if(fs.existsSync(sqlPath)) {//存在数据库文件,执行sql
            var sql = fs.readFileSync(sqlPath).toString();
            sql = replaceFix(sql);//替换数据前缀
            yield $SYS.sequelize.query(sql);//执行操作
        }
        config.type=2;//修改记录状态
        if (fs.existsSync(installPath) || (yield fscp.mkdirp(installPath, '0755'))) {//判定文件夹是否存在
            fs.writeFileSync(configFile,JSON.stringify(config));//修改配置文件
        }

            $this.success();
        }else{
            $this.error();
        }
    };


    function replaceFix(sql){
        var prefix='';
        switch($C.sqlType){
            case 1: prefix=$C.mysql.prefix;break;
            case 2: prefix=$C.pgsql.prefix;break;
        }
        sql=sql.replace(/\[\$prefix\]/g,prefix);//替换数据前缀
        return sql;
    }

    return main;
};