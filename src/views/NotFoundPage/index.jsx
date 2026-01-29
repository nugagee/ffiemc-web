import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import ErrorImage from "./Error_files/404.svg";
import "./Error_files/bootstrap.css";
import "./Error_files/style.css";

const getURL = () => {
  var url = window.location;
  var path = window.location.pathname;
  var page = path.split("/").pop();
  if ( page === "gigm-mobile-app" || page === "Customer-Care") {
    window.location.replace("https://gigm.com/Contact-Us");
  } else if (page === "Bus-Terminal" || page === "Terminals") {
    window.location.replace("https://gigm.com/Bus-Terminal");
  } else if (
    page === "Captain" ||
    page === "Default" ||
    page === "How-To-Book-A-Bus" ||
    page === "Learning-Academy" ||
    // page === "Luggage-Allowance" ||
    page === "Learning-Academy" ||
    page === "Schedule" ||
    // page === "Travels-Tours" ||
    page === "gigm-mobile-app"
  ) {
    window.location.replace("https://gigm.com");
    } else if (page === "About-Us.aspx") {
      window.location.replace("https://gigm.com/About-Us");
  } else if ( page === "https://gigm.com/privacy") {
    window.location.replace("https://gigm.com/Privacy-Policy");
    // } else if (page === "Customer-Care") {
    //   window.location.replace("https://gigm.com/Contact-Us");
  } else if (page === "Pickupservice" || page === "pickupservice") {
    window.location.replace("https://gigm.com/Pickupservice");
  } else if (url === "http://www.gigm.com/" || url === "http://gigm.com/") {
    window.location.replace("https://gigm.com/");
    // } else if (page === "Terms-and-Conditions") {
    //   window.location.replace("https://gigm.com/Terms-and-Conditions");
    // } else if (page === "hire-vehicle") {
    //   window.location.replace("https://gigm.com/hire-vehicle");
  }
};

export const NotFound = () => {
  useEffect(() => {
    getURL();
  }, []);

  return (
    <div style={{ margin: "0 auto" }}>
      <h1>
        {/* How did you get here???? Please go back <Link to="/">home</Link>{" "} */}
      </h1>
      <div class="col-12">
        {/* Start: error page */}
        <div class="min-vh-100 content-center">
          <div class="error-page text-center">
            <img
              src={ErrorImage}
              alt="404"
              class="svg"
              style={{ width: "60%" }}
            />
            <div class="error-page__title">404</div>
            <h5 class="fw-500" style={{ padding: "20px" }}>
              Sorry! an error occurred while processing your request.
            </h5>
            <br />
            <br />
            <div class="content-center mt-30">
              <Link
                to="/"
                class="btn btn-primary btn-default btn-squared px-30"
              >
                Return Home
              </Link>{" "}
            </div>
          </div>
        </div>
        {/* End: error page */}
      </div>
    </div>
  );
};

export default NotFound;
