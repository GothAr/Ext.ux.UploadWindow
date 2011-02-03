Ext.ns('Ext.ux.Upload');

(function(){
	var eXT = Ext,
		Upload = eXT.ux.Upload;
Upload.Window = eXT.extend(eXT.Window, {

    // upload configuration
    // actions to use when uploading
	uploadActions: { 
        // get next upload object from queue
		getNext: Upload.Manager.getNextFromQueue,  
        // get names of all files
		getAllFiles: Upload.Manager.getAllUploadFiles,
        // call this when upload is stoping
		stopUpload: Upload.Manager.clearUploadQueue,
        // call this when upload is paused
		//pauseUpload: Upload.Manager.,
        // call this when adding file
		addFile: Upload.Manager.addUploadToQueue,
        // call this when removing file
		removeFile: Upload.Manager.removeFromQueue,
        // get request GET params
		getParams: null
    },
	// this message is returned when upload handler (or page) was not found
    noUploadHandler: 'There is no upload handler',
	// current upload object
    currentUpload: undefined,
    // local data for uploadStore
	uploadData: [],
    // total number of uploads
	totalUploads: undefined, 
    // current upload index
	uploadIndex: -1, 
    // function to get upload url. url can be specified by this function or by uploadUrl property
	getUploadUrl: undefined, 
    // function to get progress url. url can be specified by this function or by progressCfg.url property
	getProgressUrl: undefined, 
    // interval for progress requests
	requestInterval: 500, 
    // store for hold upload progress status
	uploadStore: new eXT.data.ArrayStore({  
        fields: [
        // uploaded file name
		'fileName',
		// current upload progress
        { name: 'uploadProgress', type: 'float' },
        // current upload state. see uploadStateRenderer
		{ name: 'uploadResult', type: 'int'}]
    }),
	// upload configuration
    uploadProcess: {  
		//pause/resume is avaibled
        pauseable: true,
        // stop-cancel upload	
        stopable: true,
		// add button is present
        addable: true
    },
	// setted to true when upload is cancelled;
    isUploadCancelled: false,
    // icon configuraion for window buttons
	iconCfg: { 
        start: 'images/Play.png',
        stop: 'images/Stop.png',
        pause: 'images/Pause.png',
        add: 'images/Add.png',
        remove: 'images/Delete.png',
		headerIconCls: 'header-icon'
    },
	// OK button is disabled
    disableOkButton: false,
	// start uploading when show window
    uploadOnShow: false,
	// can you remove file when uploading is started
    canRemoveFile: true,
	// enable of getting progress information
    progressEnable: true,
    // use cross-domain requests or same-domain
	useCrossDomain: false, 
    // function to get upload progress when using cross domain communications
	getCrossDomainProgress: undefined,
    // upload url
	uploadUrl: undefined, 
    // configuration for progress request. url, method, params
	progressCfg: undefined, 
    // send file idx to/from server.
	sendFileIdx: false,  
    // stop upload process on server or on client
	serverStop: false,  
    // configuration for server stop uploading request.
	stopCfg: undefined, 
    // private member. are we uploading?
	uploading: false,

    //window configuration
    title: 'Upload window',
    width: 500,
    height: 300,
    collapsible: true,
    closable: false,
    closeAction: 'hide',
    frame: true,
    border: true,
    layout: 'border',
    resizable: false,

    // upload functions
    // public
    pauseUpload: function () {
        this.uploading = !this.uploading;
        if (!this.uploading) {
            if (this.serverStop) {
                this.serverStopUpload.invoke(this.onError);
            } else {
                this.clientStopUpload.invoke(this.onError);
            }
            this.activateComponents.invoke(this.onError, this, false);
            this.pauseButton.setDisabled(false);

            this.uploadActions.pauseUpload.invoke(this.onError);
            if (this.uploadProcess.stopable) {
                this.pauseButton.setText('Resume');
            }
            this.setTitle.invoke(this.onError, this, 'Uploading paused');
        } else {
            if (this.uploadProcess.stopable) {
                this.pauseButton.setText('Pause');
            }
            this.activateComponents.invoke(this.onError, this, true);
            this.startUploading.invoke(this.onError);
            this.setTitle.invoke(this.onError, this, 'Uploading resumed');
        }
    },
    // public
    cancelUpload: function () {
        var items = this.uploadData, len = items.length, i = 0;

        this.isUploadCancelled = true;

        for (; i < len; i += 1) {
            items[i][1] = 100;

            if (items[i][2] < 2) {
                items[i][2] = 3;
            }
        }
        this.uploadStore.loadData(items);

        if (this.serverStop) {
            this.serverStopUpload.invoke(this.onError);
        } else {
            this.clientStopUpload.invoke(this.onError);
        }

        this.setTitle.invokeCall(this.onError, this, 'Upload cancelled');
        if (this.uploadProcess.stopable) {
            this.startButton.setText('Start');
        }
        this.updateProgress.invoke(this.onError, this, 100);
        this.uploading = false;

        this.activateComponents.invoke(this.onError, this, false);
        if (!this.uploadOnShow) {
            this.setFilesModel.invoke(this.onError);
        }

        this.uploadIndex = -1;
        this.uploadActions.stopUpload.invoke(this.onError);
        this.fireEvent('uploadcompleted');
    },
    // public
    stopUpload: function () {
        var items = this.uploadData, len = items.length, i = 0;

        for (; i < len; i += 1) {
            items[i][1] = 100;

            if (items[i][2] < 2) {
                items[i][2] = 2;
            }
        }
        this.uploadStore.loadData(items);


        if (this.serverStop) {
            this.serverStopUpload.invoke(this.onError);
        } else {
            this.clientStopUpload.invoke(this.onError);
        }

        this.setTitle.invoke(this.onError, this, 'Uploading completed');
        if (this.uploadProcess.stopable) {
            this.startButton.setText('Start');
        }
        this.updateProgress.invoke(this.onError, this, 100);
        this.uploading = false;

        this.activateComponents.invoke(this.onError, this, false);
        if (!this.uploadOnShow) {
            this.setFilesModel.invoke(this.onError);
        }

        this.uploadIndex = -1;
        this.uploadActions.stopUpload.invoke(this.onError);
        this.fireEvent('uploadcompleted');
    },
    // public
    startUpload: function () {
        if (this.uploadIndex >= this.totalUploads) {
            this.stopUpload.invoke(this.onError);
            return;
        }

        if (this.uploading) {
            this.cancelUpload.invoke(this.onError);
            return;
        }

        if (this.uploadIndex < 0) {
            this.uploadIndex = 0;
        }

        this.isUploadCancelled = false;
		this.uploading = true;
        
		if (this.uploadProcess.stopable) {
            this.startButton.setText('Stop');
        }
        this.activateComponents.invoke(this.onError, this, true);

        if (!this.uploadIndex) {
            this.uploadStore.loadData([]);
            this.updateProgress.invoke(this.onError, this, 0);
        }
        if (!this.canRemoveFile) {
            this.setProgressModel.invoke(this.onError);
        }
        this.fireEvent('uploadstarted');
        this.startUploading.invoke(this.onError);
    },

    // private. is called when happend some error in function execution
    onError: function (err) {
		if (eXT.isDefined(console)){
			console.dir(err);
		}
    },
    okHandler: function () {
        this.hide();
    },
    //private
    setFilesModel: function () {
        this.uploadGrid.reconfigure(this.uploadStore, this.filesModel);
    },
    //private
    setProgressModel: function () {
        this.uploadGrid.reconfigure(this.uploadStore, this.progressModel);
    },
    //private
    initUploadData: function () {
        var files = this.uploadActions.getAllFiles(), i = 0, len = files.length, items, idx = 0;
        this.uploadData = [];
        if (this.uploading) {
            items = this.uploadStore.data.items;
            while (i < items.length && !idx) {
                this.uploadData.push([items[i].json[0], items[i].json[1], items[i].json[2]]);
                if (!items[i].json[2]) { // we found first file with state 'in queue'
                    idx = i;
                }
                i += 1;
            }
        }
        for (; i < len; i += 1) {
            this.uploadData.push([files[i], 0, 0]);
        }
        this.totalUploads = this.uploadData.length;
        this.uploadStore.loadData(this.uploadData);
    },
    // private
    serverStopUpload: function () {
        eXT.Ajax.request({
            url: this.stopCfg.url || this.getUploadUrl.invoke(this.onError),
            method: this.stopCfg.method || 'GET',
            params: this.stopCfg.params || {}
        });
    },
    // private
    clientStopUpload: function () {
        function findIFrame() {
            return eXT.get(document.body).select('iframe.x-hidden:last').item(0);
        }
        var frame = findIFrame() || {
            dom: {
                contentWindow: window
            },
            manuallyCreated: true
        };
        if (eXT.isIE) {
            frame.dom.contentWindow.document.execCommand('Stop');
            //document.execCommand('Stop'); // on cross-domain this not working
        } else {
            //frame.dom.stop(); // on cross-domain this not working
            frame.dom.contentWindow.stop();
        }
        if (!frame.manuallyCreated) {
            eXT.removeNode(frame.dom);
        }
    },
    // private
    checkProgress: function () {
        var me = this;
        function successRequest(res) {
            var result;
            if (!res) {
                result = me.getCrossDomainProgress.invoke(me.onError);
            } else {
                result = eXT.util.JSON.decode(res.responseText).result;
            }
            if (result === '') {
                result = 100;
            }
            me.successProgress.invoke(me.onError, me, result);
            me.checkProgress.defer(me.progressCfg.interval || me.requestInterval, me);
        }

        if (!this.uploading) {
            return;
        }
        if (this.useCrossDomain) {
            this.requestCrossDomain.invoke(this.onError, this, successRequest, null, this);
        } else {
            this.requestSameDomain.invoke(this.onError, this, successRequest, null, this);
        }
    },
    // private
    requestSameDomain: function (onSuccess, onFailure, scope) {
        if (this.sendFileIdx) {
            eXT.apply(this.progressCfg.params, {
                fileIdx: this.uploadIndex
            });
        }
        eXT.Ajax.request({
            url: this.progressCfg.url || this.getUploadUrl.invoke(this.onError),
            method: this.progressCfg.method || 'GET',
            params: eXT.apply(this.uploadActions.getParams.invoke(this.onError, this, this.currentUpload), this.progressCfg.params || {}),
            success: function (res) {
                if (onSuccess) {
                    onSuccess.apply(scope, arguments);
                }
            },
            failure: function (ajax, res) {
                if (onFailure) {
                    onFailure.apply(scope, arguments);
                }
            }
        });
    },
    //private
    requestCrossDomain: function (onSuccess, onFailure, scope) {
        var script = document.createElement('script'),
            head = document.getElementsByTagName('head')[0],
            params = eXT.apply(this.uploadActions.getParams.invoke(this.onError, this, this.currentUpload), this.progressCfg.params || {});
        if (this.sendFileIdx) {
            eXT.apply(params, {
                fileIdx: this.uploadIndex
            });
        }
        script.setAttribute('src', (this.progressCfg.url || this.getProgressUrl.invoke(this.onError)) + '?' + eXT.urlEncode(params));
        script.setAttribute('type', 'text/javascript');
        head.appendChild(script);
    },
    // private
    successProgress: function (value) {
        var progress, fileProgress;
        if (!this.uploading || this.uploadIndex >= this.totalUploads) {
            this.stopUpload.invoke(this.onError);
            return;
        }
        if (value < 0) {
            value = 0;
        }

        fileProgress = 100 / this.totalUploads;
        fileProgress = value * fileProgress / 100;
        progress = this.uploadIndex * 100 / this.totalUploads;
        progress += fileProgress;

        value = Math.round(value * 100) / 100;
        progress = Math.round(progress * 100) / 100;

        this.updateProgress.invoke(this.onError, this, progress);
        this.updateFileProgress.invoke(this.onError, this, value);
        this.updateTitle.invoke(this.onError, this, progress, value, this.uploadData[this.uploadIndex][0]);
    },
    //private
    updateTitle: function (totalProgress, fileProgress, fileName) {
        if (this.collapsed) {
            this.setTitle('Uploading file ' + eXT.util.Format.ellipsis(fileName, 30) + ' on ' + fileProgress + '%. Total uploaded - ' + totalProgress + '%');
        } else {
            this.setTitle('Uploading file ' + eXT.util.Format.ellipsis(fileName, 30) + ' on ' + fileProgress + '%.');
        }
    },
    // private
    updateProgress: function (value) {
        this.uploadProgress.updateProgress(value / 100, 'Upload progress: ' + value + '%');
    },
    //private
    updateFileProgress: function (value) {
        this.uploadData[this.uploadIndex][1] = value;
        this.uploadStore.loadData(this.uploadData);
    },
    //private
    updateFileState: function (state, errorMessage) {
        var message;
       
        if (state > 1) {
            this.updateFileProgress(100);
        }

        this.uploadData[this.uploadIndex][2] = state;
        if (errorMessage) {
            message = !this.uploadData[this.uploadIndex][3] ? '' : this.uploadData[this.uploadIndex][3];
            if (message === '' || message === this.noUploadHandler) {
                this.uploadData[this.uploadIndex][3] = unescape(errorMessage);
            }
        }
        this.uploadStore.loadData(this.uploadData);
    },
    // private
    startUploading: function () {
        var me = this;

        this.currentUpload = this.uploadActions.getNext.invoke(this.onError);

        if (!this.uploading || this.uploadIndex >= this.totalUploads || !this.currentUpload) {
            this.stopUpload.invoke(this.onError);
            return;
        }

        eXT.Ajax.request({
            url: (this.uploadUrl || this.getUploadUrl.invoke(this.onError)) + '?' + eXT.urlEncode(this.uploadActions.getParams.invoke(this.onError, this, this.currentUpload)),
            method: 'POST',
            form: this.currentUpload.uploadForm.el.dom,
            isUpload: true,
            success: function (result, opt) {
                me.onSuccessUpload(result);
            },
            failure: function (ajax, opt) {
                me.onFailureUpload();
            }
        });

        this.updateFileState.invoke(this.onError, this, 1);
        if (this.progressEnable) {
            this.checkProgress.defer(500, this); // first progress is with 500 interval. other with configurated interval.
        }
    },
    clearUpload: function () {
    },
    //private
    onSuccessUpload: function (result) {
        this.fireEvent('uploadsuccess');
    },
    //private
    onFailureUpload: function () {
        this.fireEvent('uploadfailure');
    },
    //private
    activateComponents: function (uploading) {
        this.okButton.setDisabled(this.disableOkButton && uploading);
        if (this.uploadProcess.stopable) {
            this.startButton.setDisabled(!this.uploadOnShow || !uploading);
        }
        //add button enabling
    },
    //private. upload name renderer depending on upload state
    uploadFileRenderer: function (value, metaData, record) {
        if (record.data.uploadResult >= 10) {
            return '<span style="color:red">' + value + '</span>';
        } else {
            return value;
        }
    },
    //private. upload result renderer
    uploadResultRenderer: function (value, metadata, record) {
        var qwidth = 300;
        if (value === -1) {
            return 'New';
        } else if (value === 0) {
            return 'In Queue';
        } else if (value === 1) {
            return 'Uploading';
        } else if (value === 2) {
            return 'Complete';
        } else if (value === 3) {
            return 'Stopped';
        } else {
            if (record.json[3]) {
                if (record.json[3] === this.noUploadHandler) {
                    qwidth = 180;
                }
                metadata.attr = 'style="cursor: hand" ext:qwidth="' + qwidth + '" ext:qtip="' + record.json[3] + '"';
            }
            return '<span style="color:red">Failure</span>';
        }
    },
    //private. upload progress renderer
    uploadProgressRenderer: function (value) {
        var width = Math.round(value * 50 / 100);
        return '<div style="border: 1px solid #6593CF; margin-bottom: 2px; margin-top: 2px; overflow:hidden; width: 50px;" id="ext-gen72">' +
                    '<div style="background: #E0E8F3; height: 6px;" id="ext-gen74">' +
                        '<div style="background:#8BB8F3; border-bottom: 1px solid #65A1EF; border-right: 1px solid #65A1EF; height: 5px; width: ' + width + 'px; ">' +
                        '</div>' +
                    '</div>' +
               '</div>';
    },
	//private. create files column model
	getFileColumnModel: function(){
		var me = this;
		return new eXT.grid.ColumnModel({
			columns:[{ header: 'File Name', width: 200, dataIndex: 'fileName', renderer: this.uploadFileRenderer },
						{ header: 'Progress', dataIndex: 'uploadProgress', renderer: this.uploadProgressRenderer },
						{ header: 'State', dataIndex: 'uploadResult', renderer: this.uploadResultRenderer },
						{
							xtype: 'actioncolumn',
							hideable: false,
							menuDisabled: true,
							width: 25,
							items: [{
								icon: this.iconCfg.remove,
								handler: function (grid, rowIndex) {
									if (rowIndex === me.uploadIndex) {
										return;
									}
									me.uploadActions.removeFile(rowIndex);
									me.fireEvent('fileremoved', rowIndex);
								}
							}]
						}]
		});
	},
	//private. create progress column model
	getProgressColumnModel: function(){
		var me = this;
		return new eXT.grid.ColumnModel({
			columns: [{ header: 'File Name', width: 200, dataIndex: 'fileName', renderer: this.uploadFileRenderer },
					  { header: 'Progress', dataIndex: 'uploadProgress', renderer: this.uploadProgressRenderer },
					  { header: 'State', dataIndex: 'uploadResult', renderer: this.uploadResultRenderer}]
		});
	},
	
	initEvents: function(){
		Upload.Window.superclass.initEvents.apply(this, arguments);
	},
    //inherited
    initComponent: function () {
        var me = this,
            toolbar = [],
            filesColModel = this.getFileColumnModel(),
            progressColModel = this.getProgressColumnModel()

        if (this.uploadProcess.addable) {
            toolbar.push({
                xtype: 'fileuploadfield',
                ref: '../fileChooseButton',
                createNewInput: true,
                buttonCfg: {
                    icon: this.iconCfg.add,
                    text: 'Add file'
                },
                buttonOnly: true,
                listeners: {
                    fileselected: function (but, fileName, fileEl) {
                        me.uploadActions.addFile.invoke(me.onError, me, fileEl);
                        me.fireEvent('fileadded', fileName);
                    }
                }
            });
            toolbar.push({
                xtype: 'tbfill'
            });
        }
        if (this.uploadProcess.pauseable) {
            toolbar.push({
                xtype: 'button',
                ref: '../pauseButton',
                icon: this.iconCfg.pause,
                text: 'Pause',
                handler: function () {
                    me.pauseUpload.invoke(me.onError);
                }
            });
        }
        if (this.uploadProcess.stopable) {
            toolbar.push({
                xtype: 'button',
                ref: '../startButton',
                icon: this.iconCfg.start,
                text: 'Start',
                handler: function () {
                    me.startUpload.invoke(me.onError);
                }
            });
        }
        eXT.apply(this, {
            filesModel: filesColModel,
            progressModel: progressColModel,
            tbar: {
                items: [toolbar]
            },
            iconCls: me.iconCfg.headerIconCls,
            items: [{
                xtype: 'panel',
                frame: true,
                border: false,
                region: 'center',
                items: [{
                    xtype: 'progress',
                    ref: '../uploadProgress',
                    hideLabel: true,
                    text: 'Upload progress: 0%'
                }]
            }, {
                xtype: 'grid',
                region: 'south',
                ref: 'uploadGrid',
                height: 172,
                style: 'padding-top: 5px',
                store: this.uploadStore,
                viewConfig: {
                    forceFit: true
                },
                colModel: filesColModel
            }],
            buttons: [{
                text: 'OK',
                icon: me.iconCfg.ok,
                ref: '../okButton',
                handler: function () {
                    me.okHandler.invoke(me.onError);
                }
            }]
        });
        Upload.Window.superclass.initComponent.apply(this, arguments);

        this.addEvents(
            'progress',
            'startupload',
            'stopupload',
            'uploadfailure',
            'uploadsuccess',
            'appendfiles',
            'fileadded',
            'fileremoved',
            'uploadcompleted',
            'uploadstarted');

        this.on('show', function (win) {
            win.initUploadData.invoke(win.onError);
            if (win.uploadOnShow) {
                win.setTitle('Uploading process');
                win.startUpload.invoke(win.onError);
            }
        });

        this.on('fileadded', function (fileName) {
            var store = this.uploadGrid.getStore(),
                file = [[fileName, 0, -1]];
            store.loadData(file, true);
        }, this);

        this.on('fileremoved', function (row) {
            this.uploadGrid.getStore().removeAt(row);
        }, this);

        this.on('appendfiles', function () {
            this.initUploadData.invoke(this.onError);
        }, this);

        this.on('uploadfailure', function (message) {
            if (this.uploadIndex < 0) { // we had been
                this.uploadIndex = this.totalUploads - 1;
            }
            this.updateFileState(10, message);
            this.successProgress(100);

            this.uploadIndex += 1;
            this.startUploading.invoke(this.onError); // maybe better use startUploading

        }, this);

        this.on('uploadsuccess', function () {
            this.updateFileState(2);

            this.uploadIndex += 1;
            this.startUploading(); // maybe better use startUploading

            //this.successProgress(100);
        }, this);

        this.on('progress', function (value) {
            if (!this.uploading) {
                return;
            }
            this.successProgress.invoke(this.onError, this, value);
            this.checkProgress.defer(this.progressCfg.interval || this.requestInterval, this);
        }, this);
    }
});
}());