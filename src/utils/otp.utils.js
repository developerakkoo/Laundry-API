require("dotenv").config();
const MSG91_AUTH_KEY = process.env.MSG91_API_KEY;

/**
 * Sends a mobile OTP using the MSG91 API.
 *
 * @param {string} phoneNumber - The mobile number to send the OTP to.
 *
 * @returns {Promise<object>} - A promise that resolves to the API response data.
 * The response data will contain information about the OTP sent status.
 *
 * @example
 * const phoneNumber = '1234567890';
 * sendMobileOtp(phoneNumber)
 *   .then(data => console.log(data))
 *   .catch(err => console.error(err));
 */
exports.sendMobileOtp = async (phoneNumber, template_id) => {
    const options = {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/json",
            authkey: MSG91_AUTH_KEY,
        },
        body: JSON.stringify({
            Param1: "value1",
            Param2: "value2",
            Param3: "value3",
        }),
    };
    const response = await fetch(
        `https://control.msg91.com/api/v5/otp?type=text&template_id=${template_id}&mobile=91${phoneNumber}&otp_length=4`,
        options,
    );
    const data = await response.json();
    return data;
    /*  .then(response => response.json())
          .then(response => {
              
              return res.status(status.ok).json({message:'Otp send Successfully',statusCode:status.ok,mobileOtp:response});
          })
          .catch(err => {
              return   res.status(status.bad_req).json({message:'Error While Sending Otp',statusCode:status.bad_req,data:err});
          }); */
};

/**
 * Verifies a mobile OTP using the MSG91 API.
 *
 * @param {string} phoneNumber - The mobile number to verify the OTP for.
 * @param {string} otp - The OTP to verify.
 *
 * @returns {Promise<object>} - A promise that resolves to the API response data.
 * The response data will contain information about the verification status.
 *
 * @example
 * const phoneNumber = '1234567890';
 * const otp = '1234';
 * verifyMobileOtp(phoneNumber, otp)
 *   .then(data => console.log(data))
 *   .catch(err => console.error(err));
 */
exports.verifyMobileOtp = async (phoneNumber, otp) => {
    const options = {
        method: "GET",
        headers: {
            accept: "application/json",
            authkey: MSG91_AUTH_KEY,
        },
    };
    const response = await fetch(
        `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=91${phoneNumber}`,
        options,
    );
    const data = await response.json();
    return data;
};
