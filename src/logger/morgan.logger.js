
const  morgan = require('morgan');
const { logger } = require('./winston.logger')


const stream = {
    // Use the http severity
    write: (message) => logger.http(message.trim()),
  };
  
  const skip = () => {
    const env = process.env.NODE_ENV || "DEV";
    return env !== "DEV";
  };
  
  const morganMiddleware = morgan(
    ":remote-addr :method :url :status - :response-time ms",
    { stream, skip }
  );


    module.exports = morganMiddleware;

    /*
    -- For logging all info --
const morganMiddleware = morgan(
    function (tokens, req, res) {
        return JSON.stringify({
            method: tokens.method(req, res),
            url: tokens.url(req, res),
            status: Number.parseFloat(tokens.status(req, res)),
            content_length: tokens.res(req, res, "content-length"),
            response_time: `${Number.parseFloat(tokens["response-time"](req, res))}ms`,
            user_agent: tokens["user-agent"](req, res),
            remote_ip: tokens["remote-addr"](req, res),
            date: new Date().toISOString(),
            body: req.body,
            query: req.query,
            params: req.params,
            headers: req.headers,
            cookies: req.cookies,
            user: req.user,
            ip: req.ip,
        });
    },
    {
        stream,
        skip,
    },
);

    */