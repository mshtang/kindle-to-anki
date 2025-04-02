import { ReplaySubject } from "rxjs";
import config from "../config";

interface UserData {
  scores?: any;
  [key: string]: any;
}

const localStorage = window.localStorage;
const { apiUrl } = config;
const subject = new ReplaySubject<UserData | null>(1);

let userData: UserData | null = null;

export default class User {
  /**
   * @type {ReplaySubject}
   */
  static subject: ReplaySubject<UserData | null>;

  static get(): UserData | null {
    return userData;
  }

  static set(data: UserData | null): void {
    userData = data;
    subject.next(userData);
    this.save();
  }

  static save(): void {
    return localStorage.setItem("user", JSON.stringify(userData));
  }

  static restore(): UserData | null {
    return JSON.parse(localStorage.getItem("user") || "null");
  }

  static requestToken(code: string, csrf: string): Promise<any> {
    return fetch(
      new Request(`${apiUrl}/auth`, {
        mode: "cors",
        method: "POST",
        body: JSON.stringify({ code, csrf }),
      })
    ).then((resp) => resp.json());
  }

  static requestAppId(): Promise<any> {
    return fetch(
      new Request(`${apiUrl}/credentials`, {
        mode: "cors",
      })
    ).then((resp) => resp.json());
  }

  static updateScore(scores: any): Promise<any> | void {
    if (!userData) return;

    userData.scores = scores;

    this.save();

    return fetch(
      new Request(`${apiUrl}/scores`, {
        mode: "cors",
        method: "PUT",
        body: JSON.stringify(userData),
      })
    ).then((resp) => resp.json());
  }
}

User.subject = subject;
// Restore from the localStorage
User.set(User.restore());
