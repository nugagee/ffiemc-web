import React from "react";
// import CookieConsent from "react-cookie-consent";
// import TagManager from "react-gtm-module";
import "./assets/css/App.css";
import AllPages from "./routes/routes";
// import { GoogleOAuthProvider } from "@react-oauth/google";

// const tagManagerArgs = {
//   gtmId: "GTM-NCBTVTL",
// };

// TagManager.initialize(tagManagerArgs);

// const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const CLIENT_ID = "131472450957-9ph13db4vdu6egn8mq9dc2d6lrf3qp4f.apps.googleusercontent.com";

function App() {
  return (
    <>
      {/* <GoogleOAuthProvider clientId={CLIENT_ID}> */}
        <AllPages />
      {/* </GoogleOAuthProvider> */}

      {/* <CookieConsent
        location="bottom"
        buttonText="I agree"
        cookieName="gigmCookies"
        style={{
          background: "#ffffff",
          color: "black",
          minHeight: "100px",
          // width: "60%",
          display: "flex",
          alignItems: "center",
        }}
        buttonStyle={{
          background: "#007bff",
          color: "white",
          fontSize: "13px",
          fontWeight: "bold",
          marginTop: "10px 40px",
          borderRadius: "5px",
          padding: "5px 15px",
          width: "250px",
        }}
        declineButtonStyle={{
          background: "red",
          color: "white",
          fontSize: "13px",
          fontWeight: "bold",
          marginTop: "10px",
          borderRadius: "5px",
          padding: "5px 15px",
        }}
        expires={150}
        buttonClasses="btn btn-primary"
        containerClasses="alert alert-warning col-lg-12 text-center"
        flipButtons
        overlay
      >
        We Use Your Data to Give You the Best Experience on Our Website" and "By
        Continuing Without Changing Your Cookie Settings, We Assume You Agree to
        Our{" "}
        <span>
          <a style={{ color: "#007bff" }} href="/Terms-and-Conditions">
            Terms and Conditions.
          </a>
        </span>
        <br />
      </CookieConsent> */}
    </>
  );
}

export default App;
