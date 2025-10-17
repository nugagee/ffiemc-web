import axios from "axios";
import configs from "../configs";
// import { removeState } from "../store/removeState";
// import history from "./history.js";

export const request = (url, type, data, token = null, noStringify = false) => {
  //test
  // const baseURL = "https://api.gigmobility.co/apiV2";
  //pre-prod
  const baseURL = "https://onboarding.gigmobility.co/apiV2";
  //Prod
  // const baseURL = "https://onboarding.gigmobility2.com/apiV2";
  let API_URL = `${baseURL}${url}`;
  let bodyData;
  let service;
  bodyData = noStringify ? JSON.stringify(data) : data;
  let config;

  if (token) {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
      },
    };
  }

  if (type.toLowerCase() === "get") {
    service = axios.get(API_URL, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "post") {
    service = axios.post(API_URL, bodyData, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "delete") {
    service = axios.delete(API_URL, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else {
    service = axios.put(API_URL, bodyData, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  }
};

export const requestSetting = (
  url,
  type,
  data,
  token = null,
  noStringify = false
) => {
  //test
  // const baseURL = "https://settings.gigmobility.co/apiV2";
  //pre-prod
  const baseURL = "https://settings.gigmobility.co/apiV2";
  //Prod
  // const baseURL = "https://settings.gigmobility2.com/apiV2";
  let API_URL = `${baseURL}${url}`;
  let bodyData;
  let service;
  bodyData = noStringify ? JSON.stringify(data) : data;
  let config;

  if (token) {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
      },
    };
  }

  if (type.toLowerCase() === "get") {
    service = axios.get(API_URL, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "post") {
    service = axios.post(API_URL, bodyData, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "delete") {
    service = axios.delete(API_URL, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else {
    service = axios.put(API_URL, bodyData, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  }
};
export const requestBooking = (
  url,
  type,
  data,
  token = null,
  noStringify = false
) => {
  //test
  // const baseURL = "https://booking.gigmobility.co/apiV2";
  //pre-prod
  const baseURL = "https://booking.gigmobility.co/apiV2";
  //Prod
  // const baseURL = "https://booking.gigmobility2.com/apiV2";
  let API_URL = `${baseURL}${url}`;
  let bodyData;
  let service;
  bodyData = noStringify ? JSON.stringify(data) : data;
  let config;

  if (token) {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
      },
    };
  }

  if (type.toLowerCase() === "get") {
    service = axios.get(API_URL, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "post") {
    service = axios.post(API_URL, bodyData, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "delete") {
    service = axios.delete(API_URL, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else {
    service = axios.put(API_URL, bodyData, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  }
};
export const requestPayment = (
  url,
  type,
  data,
  token = null,
  noStringify = false
) => {
  //test
  // const baseURL = "https://payment.gigmobility.co/apiV2";
  //pre-prod
  const baseURL = "https://payment.gigmobility.co";
  //Prod
  // const baseURL = "https://payment.gigmobility2.com";
  let API_URL = `${baseURL}${url}`;
  let bodyData;
  let service;
  bodyData = noStringify ? JSON.stringify(data) : data;
  let config;

  if (token) {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
      },
    };
  }

  if (type.toLowerCase() === "get") {
    service = axios.get(API_URL, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "post") {
    service = axios.post(API_URL, bodyData, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "delete") {
    service = axios.delete(API_URL, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else {
    service = axios.put(API_URL, bodyData, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  }
};
export const requestGoogleLocation = (
  url,
  type,
  data,
  token = null,
  noStringify = false
) => {
  //pre-prod
  const baseURL = "https://googlemap.gigmobility.co";
  //Prod
  // const baseURL = "https://googlemap.gigmobility2.com";
  let API_URL = `${baseURL}${url}`;
  let bodyData;
  let service;
  bodyData = noStringify ? JSON.stringify(data) : data;
  let config;

  if (token) {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
        "ClientID": "android.app@gigm.com",
        // "ClientID": "Web.app@gigm.com",
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "ClientID": "android.app@gigm.com",
        // "ClientID": "Web.app@gigm.com",
        "Content-type": "Application/json",
      },
    };
  }

  if (type.toLowerCase() === "get") {
    service = axios.get(API_URL, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "post") {
    service = axios.post(API_URL, bodyData, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "delete") {
    service = axios.delete(API_URL, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else {
    service = axios.put(API_URL, bodyData, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  }
};
export const requestAmbassador = (
  url,
  type,
  data,
  token = null,
  noStringify = false
) => {
  //pre-prod
  const baseURL = "https://ambassador.gigmobility.co";
  //Prod
  // const baseURL = "https://ambassador.gigmobility2.com";
  let API_URL = `${baseURL}${url}`;
  let bodyData;
  let service;
  bodyData = noStringify ? JSON.stringify(data) : data;
  let config;

  if (token) {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "Content-type": "Application/json",
        // "ClientID": "Web.app@gigm.com",
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    config = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // "Content-type": "application/x-www-form-urlencoded",
        "ClientID": "Web.app@gigm.com",
        "Content-type": "Application/json",
      },
    };
  }

  if (type.toLowerCase() === "get") {
    service = axios.get(API_URL, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "post") {
    service = axios.post(API_URL, bodyData, config);
    return service
      .then((response) => {
        return service;
      })
      .catch((error) => {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else if (type.toLowerCase() === "delete") {
    service = axios.delete(API_URL, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  } else {
    service = axios.put(API_URL, bodyData, config);
    return service
      .then(function (response) {
        return service;
      })
      .catch(function (error) {
        if (error.request) {
          return service;
        }
        if (error.response) {
          return service;
        }
        return service;
      });
  }
};
