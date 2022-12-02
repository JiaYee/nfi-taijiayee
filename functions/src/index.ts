import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

const cors = require("cors")({ origin: true });
admin.initializeApp();

export const register = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (!req.body.email || !req.body.password) {
        throw "invalid email or password";
      }
      const newUserObj = await admin.auth().createUser({
        email: req.body.email,
        password: req.body.password,
      });
      functions.logger.info("Successfully created new user:", newUserObj.uid);
      admin.firestore().collection("users").doc(newUserObj.uid).set({
        walletBalance: 0,
      });
      res.send({
        uid: newUserObj.uid,
      });
    } catch (err) {
      functions.logger.error(err);
      res.send(err);
    }
  });
});
export const deposit = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (
        req.body.uid &&
        req.body.amount &&
        req.body.amount > 0 &&
        (await isUserValid(req.body.uid))
      ) {
        const currentBalance = await getUserWalletBalanceByUid(req.body.uid);
        const newBalance =
          parseFloat(currentBalance) + parseFloat(req.body.amount);
        await admin
          .firestore()
          .collection("users")
          .doc(req.body.uid)
          .update({
            walletBalance: admin.firestore.FieldValue.increment(
              parseFloat(req.body.amount)
            ),
          });
        res.send({
          newBalance: newBalance,
        });
      } else {
        throw "invalid uid or amount";
      }
    } catch (err) {
      functions.logger.error(err);
      res.send(err);
    }
  });
});
export const withdraw = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (
        req.body.uid &&
        req.body.amount &&
        req.body.amount > 0 &&
        (await isUserValid(req.body.uid))
      ) {
        const currentBalance = await getUserWalletBalanceByUid(req.body.uid);
        const newBalance =
          parseFloat(currentBalance) - parseFloat(req.body.amount);
        if (newBalance >= 0) {
          await admin
            .firestore()
            .collection("users")
            .doc(req.body.uid)
            .update({
              walletBalance: admin.firestore.FieldValue.increment(
                -parseFloat(req.body.amount)
              ),
            });
          res.send({
            newBalance: newBalance,
          });
        } else {
          throw "insufficient balance";
        }
      } else {
        throw "invalid uid or amount";
      }
    } catch (err) {
      functions.logger.error(err);
      res.send(err);
    }
  });
});
async function isUserValid(uid: string): Promise<boolean> {
  return (await admin.firestore().collection("users").doc(uid).get()).data()
    ? true
    : false;
}
async function getUserWalletBalanceByUid(uid: string) {
  try {
    const userObj: any = await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();
    return userObj.data().walletBalance;
  } catch (err) {
    functions.logger.error(err);
    return 0;
  }
}
