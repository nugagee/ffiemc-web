import config from "../configs";

const makeAPICall = async (
  { method = "POST", payload = null },
  ...customConfigs
) => {
  const headers = {
    "Content-type": "application/json",
    Authorization:"Bearer sk_live_819965fb6e5f8b31c3d75255fa52d8f5bae793af",
    // "Authorization": `Bearer ${config.PAYSTACK_KEYS_LIVE}`,
    // "Authorization": `Bearer ${config.PAYSTACK_KEYS_TEST}`,
  };

  const configs = {
    method,
    headers,
    ...customConfigs,
  };

  if (payload) configs.body = JSON.stringify(payload);

  return window
    .fetch("https://api.paystack.co/transaction/initialize", configs)
    .then((response) => response.json())
    .catch((err) => err);
};

export default makeAPICall;
