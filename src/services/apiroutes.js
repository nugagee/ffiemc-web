// eslint-disable-next-line
export default {
  GetToken() {
    return `/customer/signin`;
  },

  Login() {
    return `/customer/signin`;
  },
  GoogleLogin() {
    return `/Customer/google`;
  },
  Register() {
    return `/customer/register`;
  },
  RegisterV2() {
    return `/customer/registerv2`;
  },
  UpdateUserProfileV2() {
    return `/customer/updateprofilev2`;
  },
  UpdateUserEmailV2() {
    return `/customer/updateemailv2`;
  },
  RouteFarePrices(departId, destId) {
    return `/Fares/GetRouteFares/departureTerminalId/destinationTerminalId?departureTerminalId=${departId}&destinationTerminalId=${destId}`;
  },
  DepartureTerminals() {
    // return `/Terminal?AvialableOnLine=1000&Paginated=false`;
    return `/Terminal/DepartureTerminalsByCountryCode/NG`;
  },
  ArrivalTerminals(departureTerminalId) {
    return `/Terminal/GetDestinationTerminals/${departureTerminalId}`;
    // return `/Terminal/GetDepartureTerminals?destinationTerminalId=${departureTerminalId}&countryCode=ng`;
  },
  BookingSearch() {
    return `/Booking/availabletripdetails`;
  },
  PostSearch() {
    return `/booking`;
  },
  InitiateCreditDirectRequest(refCode) {
    return `/Payment/InitiateCreditDirectRequest/${refCode}`;
  },
  InitiateMoniePointRequest() {
    return `/api/v1/Moniepoint/initialize`;
  },
  InitiateOpayRequest() {
    return `/api/v1/OPay/initialize`;
  },
  ConfirmMoniePointPayment(refCode) {
    return `/api/v1/Moniepoint/processMoniepointPayment/${refCode}/NGN`;
  },
  ConfirmOpayPayment() {
    return `/api/v1/OPay/verify`;
  },
  InitiatePaystackNewPayRequest() {
    return `/api/v1/Paystack/initialize`;
  },
  InitiateNombaRequest() {
    return `/api/v1/Nomba/initialize`;
  },
  ConfirmNombaPayment(refCode) {
    return `/api/v1/Nomba/processNombaPayment/${refCode}`;
  },
  HireSearchOneway(
    OnewayPickupDate,
    OnewayDistanceApart,
    OneWayDropoffLocation,
    OnewayPickupLocation
  ) {
    return `/HireBooking/bookingSearch?OnewayPickupDate=${OnewayPickupDate}&OnewayDistanceApart=${OnewayDistanceApart}&OneWayDropoffLocation=${OneWayDropoffLocation}&HiredServiceType=0&OnewayPickupLocation=${OnewayPickupLocation}&IsSleepOver=false`;
    // return `/api/hiredServiceBookings/hireservicebookingsearch`;
  },
  HireSearch(
    OnewayPickupDate,
    OnewayDistanceApart,
    OneWayDropoffLocation,
    OnewayPickupLocation,
    ReturnPickupDate = null,
    ReturnPickupLocation = null,
    ReturnDropoffLocation = null,
    IsSleepOver = false
  ) {
    return `/HireBooking/bookingSearch?OnewayPickupDate=${OnewayPickupDate}&OnewayDistanceApart=${OnewayDistanceApart}&OneWayDropoffLocation=${OneWayDropoffLocation}&HiredServiceType=1&OnewayPickupLocation=${OnewayPickupLocation}&IsSleepOver=${IsSleepOver}&ReturnPickupDate=${ReturnPickupDate}&ReturnPickupLocation=${ReturnPickupLocation}&ReturnDropoffLocation=${ReturnDropoffLocation}`;
    // return `/api/hiredServiceBookings/hireservicebookingsearch`;
  },
  HireServiceSearch() {
    return `/HireBooking/requestBooking`;
  },
  ConfirmPayStackPayment(refCode) {
    return `/Payment/ProcessPaystackPayment/${refCode}/NG`;
  },
  ConfirmFlutterPayment(refCode) {
    return `/Payment/ProcessFlutterWavePayment/${refCode}`;
  },
  ConfirmBudPayPayment(refCode) {
    return `/Payment/ProcessBudPayPayment/${refCode}`;
  },
  ConfirmAzaPayPayment() {
    return `/api/Webhook/ValidateAzaPayTransaction`;
  },
  ConfirmHirePayStackPayment(refCode) {
    return `/Payment/ProcessHiredServicePaystackPayment/${refCode}`;
  },
  ForgotPassword() {
    return `/api/customers/ForgotPasswordVerificationCode`;
  },
  ResetPassword() {
    return `/customer/forgetpasswordv2`;
  },
  SendOtp() {
    return `/customer/sendotp`;
  },
  SendOtpToPhone() {
    return `/Otp/sendtophonenumber`;
  },
  SendOtpToEmail() {
    return `/Otp/sendtoemail`;
  },
  VerifyOtp() {
    return `/customer/verifyotp`;
  },
  CustomerVerifyOtp() {
    return `/Otp/verify`;
  },
  UpdatePhoto() {
    return `/customer/updatephoto`;
  },
  UpdatePassegerProfile() {
    return `/customer/Update`;
  },
  DeletePhoto(customerId) {
    return `/api/customers/removeCustomerPhoto/${customerId}`;
  },
  GetWalletToken() {
    return `/connect/token`;
  },
  CreateWallet() {
    return `/api/WalletApi/CreateWallet`;
    // return `/api/v3/WalletApi/CreateWallet?walletType=3`;
  },
  GetWallet(phone, email) {
    return `/api/WalletApi/GetUserWallet?phone=${phone}&email=${email}`;
    // return `/api/v3/WalletApi/GetUserWallet/${phone}/${email}`;
  },
  CreatePartnerStellersAcct() {
    return `/api/v3/WalletApi/UpdateBankRequirement`;
  },
  GenerateOtp() {
    return `/api/v2/WalletApi/GenerateOtp`;
  },
  CreatePin() {
    return `/api/WalletApi/CreatePin`;
  },
  CreatePayment() {
    return `/api/PaymentApi/CreatePayment`;
  },
  VerifyPayStackRef(paystackreference) {
    return `/api/PaymentApi/VerifyPaystackRef?paymentreference=${paystackreference}`;
  },
  DebitWallet() {
    return `/api/WalletApi/DebitWallet`;
  },
  BookingHistory(email) {
    return `/CustomerBooking/bookingHistorys?Email=${email}&CountryCode=NG&Paginated=false`;
  },
  ChangePassword() {
    return `/customer/ChangePassword`;
  },

  ChangeWalletpin() {
    return `/api/WalletApi/ChangePin`;
  },
  ResetWalletpin() {
    return `/api/WalletApi/ResetPin`;
  },
  Updatecustomerstageafterwalletsetup(phone, email) {
    return `/Customer/updatecustomerstageafterwalletsetup/${phone}/${email}`;
  },
  CustomerFeedback() {
    return `/api/CustomerFeedbacks`;
  },
  BookingStatus(refCode) {
    return `/Booking/limited?BookingRefCode=${refCode}`;
  },
  SuggestRoute() {
    return `/route/addnewsuggestedroute`;
  },
  GetpopularRoute() {
    return `/Route/getpopularroutes?noOfDays=5&noOfRoutes=5`;
  },
  TrackVehicleById(imei) {
    return `/AutoTrack/vehicletrip?vehicleImei=${imei}`;
  },
  SavePartnerEnquiry() {
    return `/PartnerEnquiry`;
  },
  ProcessAmbassadorUpgradeRequest(ambassadorId) {
    return `/apiV2/Accounts/Tier3AccountUpgradeRequest/${ambassadorId}`;
  },
  VerifyTier3AccountUpgradeRequestOtp() {
    return `/apiV2/Accounts/VerifyTier3AccountUpgradeRequestOtp`;
  },
  GetAmbassadorByEmail(email) {
    return `/apiV2/Accounts/GetAmbassadorByEmail/${email}`;
  },
  SendAmbassadorOTP(id) {
    return `/apiV2/Accounts/DeleteAmbassadorRequest/${id}`;
  },
  DeleteAmbassadorAcct(ambassadorId, verificationCode) {
    return `/apiV2/Accounts/DeleteWithOTPAmbassador/${ambassadorId}/${verificationCode}`;
  },
  GetTerminalById(terminalId) {
    return `/terminal/${terminalId}`;
  },
  GetAllPaymentGateways(paymentId) {
    return `/api/v1/PaymentGateway/Gateways/${paymentId}?countryCode=NG`;
  },
  GetAllPaymentGatewaysById(id) {
    return `/api/v1/PaymentGateway/Gateways/${id}?countryCode=NG`;
  },
  CheckPassengerIn(refCode, terminalId) {
    return `/SeatManagement/getseatSelf/refcode/${refCode}/${terminalId}`;
  },
  ProcessWallet() {
    return `/Payment/ProcessWalletPayment`;
  },
  GetDistance(departureAddress, arrivalAddress) {
    return `/HireBooking/getDistance?depart=${departureAddress}&arrival=${arrivalAddress}`;
    // return `/api/booking/hiredbookings/getDistance?depart=${departureAddress}&arrival=${arrivalAddress}`;
  },
  GetDistanceByPlaceId(departureAddress, arrivalAddress) {
    return `/api/Google/getdistancewithplaceid?origin=${departureAddress}&destination=${arrivalAddress}`;
  },
  GetLocationForUser(input, sessionToken) {
    return `/api/Google/autocomplete?input=${input}&sessionToken=${sessionToken}`;
  },
  GetLocationPlaceIdDetails(placeId, sessionToken) {
    return `/api/Google/placedetails?placeId=${placeId}&sessionToken=${sessionToken}`;
  },
  GetNewToken() {
    return `/Customer/generatenewtoken`;
  },
  DeleteCustomer() {
    return `/Customer`;
  },

  // PAYBILLS API

  GetPaybillsToken() {
    return `/token`;
    // return `/token?username=it@gigm.com&password=1t@dmin123&grant_type=password`;
  },
  GeneratePaybillsRef() {
    return `/PaymentInfo/GenerateReference`;
  },
  GetPaybillsHistory() {
    return `/api/CustomerTransactions/GetTransactionByEmail`;
  },
  GetBillers() {
    return `/api/quickteller/billers`;
  },
  GetBillersCategory() {
    return `/api/quickteller/getcategory`;
  },
  GetBillersByCategory() {
    return `/api/quickteller/GetBillersByCategory`;
  },
  CutomerValidation() {
    return `/api/quickteller/CustomerValidation`;
  },
  SendPayAdvice() {
    return `/api/quickteller/SendPayAdvice`;
  },
  GetDataBundles(billerId) {
    return `/api/quickteller/GetBillerPaymentItems?billerId=${billerId}`;
  },
  GetAllTvProvider() {
    return `/api/quickteller/GetBillersByCategory?CategoryId=2`;
  },

  // LOOKUP NETWORK
  LookupNetwork(phone) {
    return `/lookup?phone=${phone}`;
  },
  // VTU
  vtu() {
    return `/wp-json/api/v1`;
  },
};

// // eslint-disable-next-line
// export default {
//   GetToken() {
//     return `/login`;
//   },
//   Login() {
//     return `/api/customers/GetPassengerProfile`;
//   },
//   Register() {
//     return `/api/customers/CreatePassenger`;
//   },
//   DepartureTerminals() {
//     return `/api/terminals/terminalbycountrycode/NG`;
//   },
//   ArrivalTerminals(departureTerminalId) {
//     return `/api/routes/terminals/destinations/${departureTerminalId}`;
//   },
//   BookingSearch() {
//     return `/api/bookings/search`;
//   },
//   PostSearch() {
//     return `/api/bookings/postsearch`;
//   },
//   HireSearch() {
//     return `/api/hiredServiceBookings/hireservicebookingsearch`;
//   },
//   HireServiceSearch() {
//     return `/api/hiredServiceBookings/hireservicebookingsearchpost`;
//   },
//   ConfirmPayStackPayment() {
//     return `/api/bookings/ProcessPaystackPayment`;
//   },
//   ConfirmFlutterPayment() {
//     return `/api/bookings/ProcessFlutterWavePayment`;
//   },
//   ConfirmBudPayPayment() {
//     return `/api/bookings/ProcessBudPayPayment`;
//   },
//   ConfirmAzaPayPayment() {
//     return `/api/Webhook/ValidateAzaPayTransaction`;
//   },
//   ConfirmHirePayStackPayment(refCode) {
//     return `/api/hiredServiceBookings/processHireServicePaystackPayment/${refCode}`;
//   },
//   ForgotPassword() {
//     return `/api/customers/ForgotPasswordVerificationCode`;
//   },
//   ResetPassword() {
//     return `/api/customers/ForgotPassword`;
//   },
//   verifyPhoneNumber() {
//     return `/api/customers/VerifyCode`;
//   },
//   UpdatePhoto(phoneNumber) {
//     return `/api/customers/UpdatePassengerPhoto?phoneNumber=${phoneNumber}`;
//   },
//   UpdatePassegerProfile() {
//     return `/api/customers/UpdatePassenger`;
//   },
//   DeletePhoto(customerId) {
//     return `/api/customers/removeCustomerPhoto/${customerId}`;
//   },
//   GetWalletToken() {
//     return `/connect/token`;
//   },
//   CreateWallet() {
//     return `/api/WalletApi/CreateWallet`;
//   },
//   GetWallet(phone, email) {
//     return `/api/WalletApi/GetUserWallet?phone=${phone}&email=${email}`;
//   },
//   GenerateOtp() {
//     return `/api/v2/WalletApi/GenerateOtp`;
//   },
//   CreatePin() {
//     return `/api/v2/WalletApi/CreatePin`;
//   },
//   CreatePayment() {
//     return `/api/PaymentApi/CreatePayment`;
//   },
//   VerifyPayStackRef(paystackreference) {
//     return `/api/PaymentApi/VerifyPaystackRef/${paystackreference}`;
//   },
//   DebitWallet() {
//     return `/api/v2/WalletApi/DebitWallet`;
//   },
//   BookingHistory(phoneNumber) {
//     return `/api/bookings/history/${phoneNumber}`;
//   },
//   ChangePassword() {
//     return `/api/customers/ChangePassword`;
//   },

//   ChangeWalletpin() {
//     return `/api/v2/WalletApi/ChangePin`;
//   },
//   ResetWalletpin() {
//     return `/api/v2/WalletApi/ResetPin`;
//   },
//   CustomerFeedback() {
//     return `/api/CustomerFeedbacks`;
//   },
//   BookingStatus(refCode) {
//     return `/api/bookings/alldetails/${refCode}`;
//   },
//   SuggestRoute() {
//     return `/api/routes/addnewsuggestedroute`;
//   },
//   GetpopularRoute() {
//     return `/api/routes/getpopularroutes?noOfDays=5&noOfRoutes=5`;
//   },
//   SavePartnerEnquiry() {
//     return `/api/partnerEnquiry/add`;
//   },
//   GetTerminalById(terminalId) {
//     return `/api/terminals/${terminalId}`;
//   },
//   CheckPassengerIn(refCode, terminalId) {
//     return `/api/booking/seatmanagements/getseatSelf/refcode/${refCode}/${terminalId}`;
//   },
//   ProcessWallet() {
//     return `/api/bookings/ProcessWalletPayment`;
//   },
//   GetDistance(departureAddress, arrivalAddress) {
//     // return `/api/booking/hiredbookings/getDistance`;
//     return `/api/booking/hiredbookings/getDistance?depart=${departureAddress}&arrival=${arrivalAddress}`;
//   },
// };
