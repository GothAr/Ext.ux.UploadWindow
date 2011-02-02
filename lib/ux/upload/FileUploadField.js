/*!
 * Ext JS Library 3.3.0
 * Copyright(c) 2006-2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
Ext.ns('Ext.ux.form');

/**
 * @class Ext.ux.form.FileUploadField
 * @extends Ext.form.TextField
 * Creates a file upload field.
 * @xtype fileuploadfield
 */
Ext.ux.form.FileUploadField = Ext.extend(Ext.form.TextField, {
    /**
    * @cfg {String} buttonText The button text to display on the upload button (defaults to
    * 'Browse...').  Note that if you supply a value for {@link #buttonCfg}, the buttonCfg.text
    * value will be used instead if available.
    */
    buttonText: 'Browse...',
    /**
    * @cfg {Boolean} buttonOnly True to display the file upload field as a button with no visible
    * text field (defaults to false).  If true, all inherited TextField members will still be available.
    */
    buttonOnly: false,
    /**
    * @cfg {Number} buttonOffset The number of pixels of space reserved between the button and the text field
    * (defaults to 3).  Note that this only applies if {@link #buttonOnly} = false.
    */
    buttonOffset: 3,
    /**
    * @cfg {Number} createNewInput This value is checked on change event. If its true then after processing will be created new input element. 
    It is good if some wants to use input element in own elements.
    (defaults to false).
    */
    createNewInput: false,
    /**
    * @cfg {Number} fileMaxSize. The maximum allowed selected file size.
    (defaults to 10Mb).
    */
    fileMaxSize: 10 * 1024 * 1024,
    /**
    * @cfg {Object} buttonCfg A standard {@link Ext.Button} config object.
    */

    // private
    readOnly: true,

    /**
    * @hide
    * @method autoSize
    */
    autoSize: Ext.emptyFn,

    // private
    initComponent: function () {
        Ext.ux.form.FileUploadField.superclass.initComponent.call(this);

        this.addEvents(
        /**
        * @event fileselected
        * Fires when the underlying file input field's value has changed from the user
        * selecting a new file from the system file selection dialog.
        * @param {Ext.ux.form.FileUploadField} this
        * @param {String} value The file value returned by the underlying file input field
        * @param {Ext.Element} el The input element
        */
            'fileselected',
            'filesizeexceed'
        );
    },

    fileRemoved: function (queueIdx) {
        //console.log(queueIdx);
    },

    // private
    onRender: function (ct, position) {
        Ext.ux.form.FileUploadField.superclass.onRender.call(this, ct, position);

        this.wrap = this.el.wrap({ cls: 'x-form-field-wrap x-form-file-wrap' });
        this.el.addClass('x-form-file-text');
        this.el.dom.removeAttribute('name');
        this.createFileInput();

        var btnCfg = Ext.applyIf(this.buttonCfg || {}, {
            text: this.buttonText
        }), width;
        this.button = new Ext.Button(Ext.apply(btnCfg, {
            renderTo: this.wrap,
            cls: 'x-form-file-btn' + (btnCfg.iconCls ? ' x-btn-icon' : '')
        }));

        if (this.buttonOnly) {
            this.initButtonOnly();
        }

        this.bindListeners();
        this.resizeEl = this.positionEl = this.wrap;
    },

    //private
    initButtonOnly: function () {
        this.el.setStyle("display", "none");
        width = this.button.getEl().getWidth();
        if (!Ext.isIE) {
            this.wrap.setWidth(width);
        } else {
            this.button.el.setStyle("right", -width + "px");
            this.fileInput.el.setStyle("right", -width + "px");
        }
    },

    //private
    isAllowedFileSize: function () {
        var objFSO,
            fsoFile,
            fileEl = this.fileInput.el.dom;
        try {
            return fileEl.files[0].size < this.fileMaxSize;
            //objFSO = new ActiveXObject('Scripting.FileSystemObject');
        }
        catch (err) {
            //if (fileEl.files) {
            //    return fileEl.files[0].size < this.fileMaxSize;
            //}
            return true;
        }

        //fsoFile = objFSO.getFile(fileEl.value);
        //return (fsoFile.size < this.fileMaxSize);
    },

    bindListeners: function () {
        this.fileInput.el.on({
            scope: this,
            mouseenter: function () {
                this.button.addClass(['x-btn-over', 'x-btn-focus']);
            },
            mouseleave: function () {
                this.button.removeClass(['x-btn-over', 'x-btn-focus', 'x-btn-click']);
            },
            mousedown: function () {
                this.button.addClass('x-btn-click');
            },
            mouseup: function () {
                this.button.removeClass(['x-btn-over', 'x-btn-focus', 'x-btn-click']);
            },
            change: function () {
                var v = this.fileInput.el.dom.value;

                this.setValue(v);
                if (!this.isAllowedFileSize()) {
                    this.fireEvent('filesizeexceed', this, v, this.fileInput.el);
                    return;
                }

                this.fireEvent('fileselected', this, v, this.fileInput.el);

                if (this.createNewInput) {
                    this.createFileInput();
                    if (this.buttonOnly) {
                        this.initButtonOnly();
                    }
                    //this.initButtonOnly();
                    this.bindListeners();
                }
            }
        });
    },

    createFileInput: function () {
        this.fileInput = new Ext.form.Field({
            autoCreate: {
                size: 1,
                tag: 'input',
                type: 'file',
                //'ext:qtitle':'Error',
                'ext:qwidth':'200',
                'ext:qtip': 'Maximum allowed file size is ' + Ext.util.Format.fileSize(this.fileMaxSize)
            },
            renderTo: this.wrap,
            cls: 'x-form-file'
        });
    },

    reset: function () {
        this.fileInput.remove();
        this.createFileInput();
        this.bindListeners();
        Ext.ux.form.FileUploadField.superclass.reset.call(this);
    },

    // private
    getFileInputId: function () {
        return this.id + '-file';
    },

    // private
    onResize: function (w, h) {
        Ext.ux.form.FileUploadField.superclass.onResize.call(this, w, h);

        this.wrap.setWidth(w);

        if (!this.buttonOnly) {
            var w_ = this.wrap.getWidth() - this.button.getEl().getWidth() - this.buttonOffset;
            this.el.setWidth(w_);
        }
    },

    // private
    onDestroy: function () {
        Ext.ux.form.FileUploadField.superclass.onDestroy.call(this);
        Ext.destroy(this.fileInput, this.button, this.wrap);
    },

    onDisable: function () {
        Ext.ux.form.FileUploadField.superclass.onDisable.call(this);
        this.doDisable(true);
    },

    onEnable: function () {
        Ext.ux.form.FileUploadField.superclass.onEnable.call(this);
        this.doDisable(false);

    },

    // private
    doDisable: function (disabled) {
        this.fileInput.dom.disabled = disabled;
        this.button.setDisabled(disabled);
    },


    // private
    preFocus: Ext.emptyFn,

    // private
    alignErrorIcon: function () {
        this.errorIcon.alignTo(this.wrap, 'tl-tr', [2, 0]);
    }

});

Ext.reg('fileuploadfield', Ext.ux.form.FileUploadField);

// backwards compat
Ext.form.FileUploadField = Ext.ux.form.FileUploadField;