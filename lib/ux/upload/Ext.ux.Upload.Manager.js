Ext.ns('Ext.ux.Upload');

Ext.ux.Upload.Manager = (function () {
    var 
        uploadWin, uploadQueue = [null];
		
	function requestCrossDomain(url) {
        var frame = Ext.getBody().createChild({
            tag: 'iframe',
            cls: 'x-hidden',
            src: url
        });
        frame.on('load', function () {
            (function () {
                Ext.removeNode(frame.dom);
            } .defer(500));
        }, frame);
    }
	
    function createFileForm(fileEl) {
        return new Ext.form.FormPanel({
            renderTo: Ext.getBody(),
            style: 'display:none',
            fileUpload: true,
            method: 'POST',
            items: [new Ext.Component(fileEl)]
        });
    }
    function removeFromQueue(queue, idx) {
        var entry, form;
        if (idx >= queue.length) {
            return;
        }
        entry = queue[idx];
        if (entry) {
            form = entry.formPanel || entry;
            form.destroy();
            Ext.removeNode(form.dom);
        }
        queue.splice(idx, 1);
    }
	
    return {
		uploadWinClass: undefined,
		getUploadWindow: function () {
            if (!this.uploadWinClass){
              return undefined;
            }
            if (!uploadWin) {
                uploadWin = new this.uploadWinClass();
            }
            return uploadWin;
        },
        
        addUploadToQueue: function (fileEl) {
            var form;
            if (fileEl) {
                form = createFileForm(fileEl);
                uploadQueue.push({
                  formPanel: form,
                  fileName: fileEl.dom.value.split('\\').pop()
                });
            } else {
                uploadQueue.splice(0, 0, null);
            }
        },
        removeFromQueue: function (idx) {
            removeFromQueue(uploadQueue, idx + 1);
        },
        clearUploadQueue: function () {
            for (var i = 0; i < uploadQueue.length; i += 1) {
                removeFromQueue(uploadQueue, i, 1);
            }
            uploadQueue = [null];
        },
        getAllUploadFiles: function () {
            var toReturn = [], i = 0, len = uploadQueue.length, upload;
            for (; i < len; i += 1) {
                upload = uploadQueue[i];
                if (upload) {
                    toReturn.push(upload.fileName);
                }
            }
            return toReturn;
        },
        getNextFromQueue: function () {
            //var fileParts, uploadForm;
            Ext.ux.Upload.Manager.uploadProgress = 0;
            if (!uploadQueue.length) {
                uploadQueue = [null];
                return;
            }
            removeFromQueue(uploadQueue, 0, 1);
            if (!uploadQueue.length) {
                return;
            }

            return {
                uploadForm: uploadQueue[0].formPanel.getForm(),
                fileName: uploadQueue[0].fileName
            };
        },

        FailedUpload: function (message) {
          if (uploadWin && uploadWin.uploading) {
            uploadWin.webServicePresent = true;
            uploadWin.fireEvent('uploadfailure', message);
          }
        },
        SuccessUpload: function () {
          if (uploadWin && uploadWin.uploading) {
            uploadWin.webServicePresent = true;
            uploadWin.fireEvent('uploadsuccess');
          }
        },
        UploadResult: function (result, message) { // this function is used on cross-domain upload
          if (Math.floor(result / 100) === 2) { // success
            this.SuccessUpload();
          } else {
            this.FailedUpload(message);
          }
        },
        UploadMessage: function (event) {
           var messageOrigin = event.origin,
               serviceParts = uploadWin.getUploadUrl().split('/'),
               serviceOrigin = serviceParts.splice(0, 3).join('/'),
               data = event.data,
               code = data.substr(0, 3),  // server code is three numbers long
               message = data.substr(3);  // other text is message. we are not evaling this code so its secure.;
           if (serviceOrigin !== messageOrigin) {
              return;
           }
           this.UploadResult(code, message);
        },
        ReportUploadProgress: function (progress, fileIdx) { // this function is used on cross-domain progress request
           currentIdx = uploadWin.getCurrentIndex();
           this.uploadProgress = progress;
           uploadWin.fireEvent('progress', progress);
        }
    };
} ());