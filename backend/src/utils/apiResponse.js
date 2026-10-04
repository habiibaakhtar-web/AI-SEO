export function success(res, message, data = {}, status = 200) {
  return res.status(status).json({ success: true, message, data });
}
export function failure(res, message, status = 500) {
  return res.status(status).json({ success: false, message });
}

