Ext.ns('GothAr.Upload');

GothAr.Upload.Window = Ext.extend(Ext.ux.Upload.Window, {
    getCurrentIndex: function () {
        return this.uploadIndex;
    },
    useCrossDomain: false,
    progressEnable: false,
    sendFileIdx: false,
    progressCfg: {
        method: 'GET',
        params:{
          action: 'progress'
        },
        interval: 500
    },
    serverStop: false,
    uploadProcess: {
        pauseable: false,
        stopable: true,
        addable: true
    },
    uploadOnShow: false,
    canRemoveFile: false,
    hideOk: true,
    onError: function(err){
      console.log(err);
      this.hideOk = true;
    },
    activateComponents: function (uploading) {
        if (this.uploadProcess.stopable) {
            this.startButton.setDisabled(this.uploadOnShow && uploading);
        }
        if (this.uploadProcess.addable) {
            this.fileChooseButton.setDisabled(uploading && !this.fileWhenUpload.canAdd);
        }
    },
    okHandler: function(){
		if (this.hideOk){
			this.hide();
		}else{
			this.collapse();
		}
    },
    upload: function () {
        if (this.hidden) {
            this.show();
        } else {
            this.fireEvent('appendfiles');
        }
    },
    initComponent: function () {
        GothAr.Upload.Window.superclass.initComponent.apply(this, arguments);

        this.on('progress', function (progress) {
            this.webServicePresent = true;  //we can say that there is web service uploader and we successfully start uploading.
        }, this);

        this.on('startupload', function(){
           this.hideOk = false;
        },this);

        this.on('filesizeexceed', function(){
            Ext.Msg.show({
               msg: 'File size exceeds file size limit'
            });
        }, this);
    }
});