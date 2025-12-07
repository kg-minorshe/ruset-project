export class Logger {
  constructor(req, res, next) {
    this.req = req;
    this.res = res;
    this.next = next;
  }
  recordLog(e) {
    console.log("recordLog: " + e);
  }
}
