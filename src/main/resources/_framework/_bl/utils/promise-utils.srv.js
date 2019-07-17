
var anyPromiseFailedException;
var execute_in_promise = function () {

    var returnedValue = null;

    var latch = new C.CountDownLatch(1);

    var deferred = Q.defer();
    var _promise = deferred.promise;

    _promise.then(function (result) {
        returnedValue = result;
        latch.countDown();
    }).fail(function (exception) {
        if (G.isNullEmpty(exception)) {
            anyPromiseFailedException = "Execution rejected...";
        } else if ($$.isException(exception)) {
            anyPromiseFailedException = exception;
            console.log($$.exceptionMessage(exception));
        } else if (!G.isNullEmpty(exception.stack)) {
            anyPromiseFailedException = exception;
            console.log(exception.stack);
        } else if (!G.isNullEmpty(exception.instMessage)) {
            anyPromiseFailedException = exception;
            console.log(exception.instMessage);
        }
        latch.countDown();
    })

    try {
        var exe = execute.bind(
            {
                resolve: function (result) {
                    deferred.resolve(result);
                },
                reject: function (error) {
                    deferred.reject(error);
                }
            }
        );
        var possibleExecutionPromise = exe.apply(null, arguments);
        if (!G.isNullEmpty(possibleExecutionPromise) && !G.isNullEmpty(possibleExecutionPromise.fail)) {
            possibleExecutionPromise.fail(function (exception) {
                deferred.reject(exception);
            })
        }
    } catch (e) {
        deferred.reject(e);
    }

    if (anyPromiseFailedException != null) {
        $$.runtimeException(anyPromiseFailedException);
    }

    //todo/kn handle the thread interruption exception
    var inTimeReturned = latch.await(5, C.TimeUnit.MINUTES);
    //todo/kn consider parameterizing this
    if (inTimeReturned == false) {
        $$.runtimeException("The execution time limit of 5 minutes has been reached!");
    }

    //todo/kn.. change the type of the exception
    if (returnedValue != null && $$.isInstanceof(returnedValue, C.Exception.class)) {
        $$.runtimeException(returnedValue);
    }

    return returnedValue;
}


