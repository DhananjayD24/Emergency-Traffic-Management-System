// custom error class for API errors
class ApiError extends Error {
    constructor(
        statusCode,                     // HTTP status (e.g. 400, 404, 500)
        message = "Something went wrong", // default error message
        errors = [],                    // extra error details (optional)
        stack = ""                      // custom stack trace (optional)
    ){
        super(message)                  // call parent Error class
        this.statusCode = statusCode    // save HTTP status
        this.data = null                // no data on error
        this.message = message          // save message
        this.success = false            // success is always false
        this.errors = errors            // store extra errors if any

        // use given stack trace or auto-generate
        if (stack) {
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

// export for use in other files
export { ApiError }
