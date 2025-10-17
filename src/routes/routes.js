import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import history from "../services/history";
import NotFound from "../views/NotFoundPage/index";
import Home from "../views/HomePage";

const AllPages = () => (
  <Router history={history}>
    <Routes>
      <Route exact path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Router>
);

export default AllPages;
