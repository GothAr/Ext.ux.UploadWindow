Function.prototype.invoke = (function(){
	var me,
		showErrorMessage,
        errorHandler,
        args,
		invokeCall = function (onError, scope) {
			var args = [].slice.call(arguments, 2, arguments.length);    
			scope = scope || null;    
			onError = onError || function () { };
			try {
				me.apply(scope, args);
			}
			catch (err) {
				onError.call(scope, {
					'func': me.toString(),
					'scope': scope,
					'arguments': args,
					'message': err
				});
			}
        };
      
	return function (handleError, scope) {
		me = this;
		args = [].slice.call(arguments, 2, arguments.length);
		scope = scope || null;
		if (typeof handleError !== "function") {
			showErrorMessage = handleError.showMessage;
			errorHandler = handleError.fn || function errorHandler(error) {
				if (typeof console !== "undefined") {
					console.log(error);
				}
				else {
					showErrorMessage(error.message);
				}
			};
		}
		args.splice(0, 0, scope);
		args.splice(0, 0, errorHandler);
		invokeCall.apply(this, args);
	};
}());

Function.prototype.profile = function (afterProfile, handleError, scope) {
    var startTime, endTime,
        args = [].slice.call(arguments, 3, arguments.length);

    afterProfile = afterProfile || function () { };
    scope = scope || null;

    args.splice(0, 0, scope);
    args.splice(0, 0, handleError);

    startTime = new Date();
    this.invoke.apply(this, args);
    endTime = new Date();

    afterProfile.call(scope, {
        'startTime': startTime,
        'endTime': endTime,
        'runTime': (+endTime) - (+startTime),

        'function': this.name,
        'func': this.toString(),
        'scope': scope,
        'arguments': args
    });
};