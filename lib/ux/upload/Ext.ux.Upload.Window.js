Ext.ns('Ext.ux');

Ext.ux.UploadWindow = Ext.extend(Ext.Window, {

    // upload configuration
    // actions to use when uploading
	uploadActions: { 
        // get next upload object from queue
		getNext: null,  
        // get names of all files
		getAllFiles: null,
        // call this when upload is stoping
		stopUpload: null,
        // call this when upload is paused
		pauseUpload: null,
        // call this when adding file
		addFile: null,
        // call this when removing file
		removeFile: null,
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
	uploadStore: new Ext.data.ArrayStore({  
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
    iconCfg: { // icon configuraion for window buttons
        start: '',
        stop: '',
        pause: '',
        add: '',
        remove: ''
    },
    disableOkButton: false,
    uploadOnShow: false, // start uploading when show window
    canRemoveFile: true, // can you remove file when uploading is started
    progressEnable: false,  // enable of getting progress information
    useCrossDomain: false, // use cross-domain requests or same-domain
    getCrossDomainProgress: undefined, // function to get upload progress when using cross domain communications
    uploadUrl: undefined, // upload url
    progressCfg: undefined, // configuration for progress request. url, method, params
    sendFileIdx: false, // send file idx to/from server. 
    serverStop: false,  // stop upload process on server or on client
    stopCfg: undefined, // configuration for server stop uploading request.
    uploading: false, // private member. show if is uploading

    //window configuration
    title: 'Upload Window',
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
                this.serverStopUpload.invokeCall(this, this.onError);
            } else {
                this.clientStopUpload.invokeCall(this, this.onError);
            }
            this.activeComponents.invokeCall(this, this.onError, false);
            this.pauseButton.setDisabled(false);

            this.uploadActions.pauseUpload.invokeCall(this, this.onError);
            //this.uploadIndex -= 1;
            if (this.uploadProcess.stopable) {
                this.pauseButton.setText('Resume');
            }
            this.setTitle.invokeCall(this, this.onError, 'Uploading paused');
        } else {
            if (this.uploadProcess.stopable) {
                this.pauseButton.setText('Pause');
            }
            this.activeComponents.invokeCall(this, this.onError, true);
            this.startUploading.invokeCall(this, this.onError);
            this.setTitle.invokeCall(this, this.onError, 'Uploading resumed');
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
            this.serverStopUpload.invokeCall(this, this.onError);
        } else {
            this.clientStopUpload.invokeCall(this, this.onError);
        }

        this.setTitle.invokeCall(this, this.onError, 'Upload cancelled');
        if (this.uploadProcess.stopable) {
            this.startButton.setText('Start');
        }
        this.updateProgress.invokeCall(this, this.onError, 100);
        this.uploading = false;

        this.activeComponents.invokeCall(this, this.onError, false);
        if (!this.uploadOnShow) {
            this.setFilesModel.invokeCall(this, this.onError);
        }

        this.uploadIndex = -1;
        this.uploadActions.stopUpload.invokeCall(this, this.onError);
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
            this.serverStopUpload.invokeCall(this, this.onError);
        } else {
            this.clientStopUpload.invokeCall(this, this.onError);
        }

        this.setTitle.invokeCall(this, this.onError, 'Uploading completed');
        if (this.uploadProcess.stopable) {
            this.startButton.setText('Start');
        }
        this.updateProgress.invokeCall(this, this.onError, 100);
        this.uploading = false;

        this.activeComponents.invokeCall(this, this.onError, false);
        if (!this.uploadOnShow) {
            this.setFilesModel.invokeCall(this, this.onError);
        }

        this.uploadIndex = -1;
        this.uploadActions.stopUpload.invokeCall(this, this.onError);
        this.fireEvent('uploadcompleted');
    },
    // public
    startUpload: function () {
        if (this.uploadIndex >= this.totalUploads) {
            this.stopUpload.invokeCall(this, this.onError);
            return;
        }

        if (this.uploading) {
            this.cancelUpload.invokeCall(this, this.onError);
            return;
        }

        if (this.uploadIndex < 0) {
            this.uploadIndex = 0;
        }

        this.uploading = true;
        if (this.uploadProcess.stopable) {
            this.startButton.setText('Stop');
        }
        this.activeComponents.invokeCall(this, this.onError, true);

        if (!this.uploadIndex) {
            this.uploadStore.loadData([]);
            this.updateProgress.invokeCall(this, this.onError, 0);
        }
        if (!this.canRemoveFile) {
            this.setProgressModel.invokeCall(this, this.onError);
        }
        this.fireEvent('uploadstarted');
        this.startUploading.invokeCall(this, this.onError);
    },

    // private. functions safe invoker.
    onError: function (err) {
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
        Ext.Ajax.request({
            url: this.stopCfg.url || this.getUploadUrl(),
            method: this.stopCfg.method || 'GET',
            params: this.stopCfg.params || {}//,
            //            success: function (res) {
            //                var result = Ext.util.JSON.decode(res.responseText).result;
            //            }
        });
    },
    // private
    clientStopUpload: function () {
        function findIFrame() {
            return Ext.get(document.body).select('iframe.x-hidden:last').item(0);
            /*if (this.uploading && !this.iframe) {
            this.findIframe.defer(200, this);
            }*/
        }
        var frame = findIFrame() || {
            dom: {
                contentWindow: window
            },
            manuallyCreated: true
        };
        if (Ext.isIE) {
            frame.dom.contentWindow.document.execCommand('Stop');
            //document.execCommand('Stop'); // on cross-domain this not working
        } else {
            //frame.dom.stop(); // on cross-domain this not working
            frame.dom.contentWindow.stop();
        }
        if (!frame.manuallyCreated) {
            Ext.removeNode(frame.dom);
        }
    },
    // private
    checkProgress: function () {
        var me = this;
        function successRequest(res) {
            var result;
            if (!res) {
                result = me.getCrossDomainProgress.invokeCall(me, me.onError);
            } else {
                result = Ext.util.JSON.decode(res.responseText).result;
            }
            if (result === '') {
                result = 100;
            }
            me.successProgress.invokeCall(me, me.onError, result);
            me.checkProgress.defer(me.progressCfg.interval || me.requestInterval, me);
        }

        if (!this.uploading) {
            return;
        }
        if (this.useCrossDomain) {
            this.requestCrossDomain.invokeCall(this, this.onError, successRequest, null, this);
        } else {
            this.requestSameDomain.invokeCall(this, this.onError, successRequest, null, this);
        }
    },
    // private
    requestSameDomain: function (onSuccess, onFailure, scope) {
        if (this.sendFileIdx) {
            Ext.apply(this.progressCfg.params, {
                fileIdx: this.uploadIndex
            });
        }
        Ext.Ajax.request({
            url: this.progressCfg.url || this.getUploadUrl(),
            method: this.progressCfg.method || 'GET',
            params: Ext.apply(this.uploadActions.getParams(this.currentUpload), this.progressCfg.params || {}),
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
    //crossDomainId: 0,
    //private
    requestCrossDomain: function (onSuccess, onFailure, scope) {
        var script = document.createElement('script'),
            head = document.getElementsByTagName('head')[0],
            params = Ext.apply(this.uploadActions.getParams(this.currentUpload), this.progressCfg.params || {});
        if (this.sendFileIdx) {
            Ext.apply(params, {
                fileIdx: this.uploadIndex
            });
        }
        script.setAttribute('src', (this.progressCfg.url || this.getProgressUrl()) + '?' + Ext.urlEncode(params));
        script.setAttribute('type', 'text/javascript');
        head.appendChild(script);
    },
    // private
    successProgress: function (value) {
        var progress, fileProgress;
        if (!this.uploading || this.uploadIndex >= this.totalUploads) {
            this.stopUpload();
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

        this.updateProgress.invokeCall(this, this.onError, progress);
        this.updateFileProgress.invokeCall(this, this.onError, value);
        this.updateTitle.invokeCall(this, this.onError, progress, value, this.uploadData[this.uploadIndex][0]);

        //        if (value === 100) {
        //            this.uploadIndex += 1;
        //            this.startUploading(); // maybe better use startUploading
        //        }
    },
    //private
    updateTitle: function (totalProgress, fileProgress, fileName) {
        if (this.collapsed) {
            this.setTitle('Uploading file ' + Ext.util.Format.ellipsis(fileName, 30) + ' on ' + fileProgress + '%. Total uploaded - ' + totalProgress + '%');
        } else {
            this.setTitle('Uploading file ' + Ext.util.Format.ellipsis(fileName, 30) + ' on ' + fileProgress + '%.');
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

        //        if (console) {
        //            console.log('data - ' + this.uploadData[this.uploadIndex]);
        //            console.log('report - ' + errorMessage);
        //            console.log('old - ' + message);
        //        }

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

        this.currentUpload = this.uploadActions.getNext();

        if (!this.uploading || this.uploadIndex >= this.totalUploads || !this.currentUpload) {
            this.stopUpload.invokeCall(this, this.onError);
            return;
        }

        Ext.Ajax.request({
            url: (this.uploadUrl || this.getUploadUrl()) + '?' + Ext.urlEncode(this.uploadActions.getParams(this.currentUpload)),
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

        this.updateFileState.invokeCall(this, this.onError, 1);
        if (this.progressEnable) {
            this.checkProgress.defer(500, this); // first progress is with 500 interval. other with configurated interval.
        }
    },
    clearUpload: function () {
    },
    //private
    onSuccessUpload: function (result) {
        //if (result.responseXML) { // we get error html page
        //    this.onFailureUpload();
        //} else {
        this.fireEvent('uploadsuccess');
        //}
    },
    //private
    onFailureUpload: function () {
        this.fireEvent('uploadfailure');
    },
    //private
    activeComponents: function (uploading) {
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
                if (record.json[3] === 'Web Uploader service not found') {
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

    //inherited
    initComponent: function () {
        var me = this,
            toolbar = [],
            filesColModel = new Ext.grid.ColumnModel({
                columns: [{ header: 'File Name', width: 200, dataIndex: 'fileName', renderer: this.uploadFileRenderer },
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
            }),
            progressColModel = new Ext.grid.ColumnModel({
                columns: [{ header: 'File Name', width: 200, dataIndex: 'fileName', renderer: this.uploadFileRenderer },
                          { header: 'Progress', dataIndex: 'uploadProgress', renderer: this.uploadProgressRenderer },
                          { header: 'State', dataIndex: 'uploadResult', renderer: this.uploadResultRenderer}]
            });

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
                        me.uploadActions.addFile(fileEl);
                        me.fireEvent('fileadded', fileName);
                    }
                }
            });
            //  need develop new upload button            
            //            toolbar.push({
            //                xtype: 'uploadbutton', 
            //                ref: 'addButton',
            //                text: 'Add'
            //            });
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
                    me.pauseUpload();
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
                    me.startUpload();
                }
            });
        }
        Ext.apply(this, {
            filesModel: filesColModel,
            progressModel: progressColModel,
            tbar: {
                items: [toolbar]
            },
            //iconCls: me.iconCfg.headerIconCls,
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
                //layout: 'fit',
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
                    me.okHandler();
                }
            }]
        });
        Ext.ux.UploadWindow.superclass.initComponent.apply(this, arguments);

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
            win.initUploadData();
            if (win.uploadOnShow) {
                win.setTitle('Uploading process');
                win.startUpload();
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
            this.initUploadData();
        }, this);

        this.on('uploadfailure', function (message) {
            if (this.uploadIndex < 0) { // we had been
                this.uploadIndex = this.totalUploads - 1;
            }
            this.updateFileState(10, message);
            this.successProgress(100);

            this.uploadIndex += 1;
            this.startUploading(); // maybe better use startUploading

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
            this.successProgress(value);
            this.checkProgress.defer(this.progressCfg.interval || this.requestInterval, this);
        }, this);
    }
});