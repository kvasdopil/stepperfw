#include <Arduino.h>
#include <FastAccelStepper.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <ArduinoJson.h>

auto const X_PULSE = 26;
auto const X_DIR = 25;

auto const Y_PULSE = 12;
auto const Y_DIR = 13;

auto const Z_PULSE = 2;
auto const Z_DIR = 4;

auto const A_PULSE = 18;
auto const A_DIR = 19;

FastAccelStepperEngine engine = FastAccelStepperEngine();
FastAccelStepper *stepperX;
FastAccelStepper *stepperY;
FastAccelStepper *stepperZ;
FastAccelStepper *stepperA;

auto const ssid = "Zhiruha";
auto const password = "bnopnya2013";
auto const hostname = "servos";

WebServer server(80);

void printWifiStatus()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("W SSID:none");
    return;
  }
  auto const ip = WiFi.localIP();
  auto const addr = String("") + ip[0] + "." + ip[1] + "." + ip[2] + "." + ip[3];
  Serial.println(String("W SSID:") + ssid + " IP:" + addr + " HOSTNAME:" + hostname + ".local");
}

int acc = 500;
int speed = 1500;

void handle_status_request()
{
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json",
              String("{") +
                  "\"x\":" + stepperX->getCurrentPosition() + "," +
                  "\"y\":" + stepperY->getCurrentPosition() + "," +
                  "\"z\":" + stepperZ->getCurrentPosition() + "," +
                  "\"a\":" + stepperA->getCurrentPosition() + "," +
                  "\"xrunning\":" + (int)stepperX->isRunning() + "," +
                  "\"yrunning\":" + (int)stepperY->isRunning() + "," +
                  "\"zrunning\":" + (int)stepperZ->isRunning() + "," +
                  "\"arunning\":" + (int)stepperA->isRunning() + "," +
                  "\"xa\": " + stepperX->getAcceleration() + "," +
                  "\"ya\": " + stepperY->getAcceleration() + "," +
                  "\"za\": " + stepperZ->getAcceleration() + "," +
                  "\"aa\": " + stepperA->getAcceleration() + "," +
                  "\"xs\": " + stepperX->getMaxSpeedInHz() + "," +
                  "\"ys\": " + stepperY->getMaxSpeedInHz() + "," +
                  "\"zs\": " + stepperZ->getMaxSpeedInHz() + "," +
                  "\"as\": " + stepperA->getMaxSpeedInHz() +
                  "}");
}

void handle_update_request()
{
  // server.sendHeader("Access-Control-Allow-Origin", "*");

  String body = server.arg("plain");
  // Serial.println("Received body: " + body);

  // Parse the JSON data
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, body);

  // Check for parsing errors
  if (error)
  {
    Serial.print("E JSON parsing error: ");
    Serial.println(error.c_str());
    server.send(400, "text/plain", "Bad Request");
    return;
  }

  if (doc.containsKey("x"))
  {
    int x = doc["x"];
    Serial.println("Moving X to " + String(x));
    stepperX->moveTo(x);
  }
  if (doc.containsKey("y"))
  {
    int y = doc["y"];
    Serial.println("Moving Y to " + String(y));
    stepperY->moveTo(y);
  }
  if (doc.containsKey("z"))
  {
    int z = doc["z"];
    stepperZ->moveTo(z);
  }
  if (doc.containsKey("a"))
  {
    int a = doc["a"];
    stepperA->moveTo(a);
  }
  if (doc.containsKey("xa"))
  {
    int xa = doc["xa"];
    Serial.println("Setting X acceleration to " + String(xa));
    stepperX->setAcceleration(xa);
  }
  if (doc.containsKey("ya"))
  {
    int ya = doc["ya"];
    stepperY->setAcceleration(ya);
  }
  if (doc.containsKey("za"))
  {
    int za = doc["za"];
    stepperZ->setAcceleration(za);
  }
  if (doc.containsKey("aa"))
  {
    int aa = doc["aa"];
    stepperA->setAcceleration(aa);
  }
  if (doc.containsKey("xs"))
  {
    int xs = doc["xs"];
    Serial.println("Setting X speed to " + String(xs));
    stepperX->setSpeedInHz(xs);
  }
  if (doc.containsKey("ys"))
  {
    int ys = doc["ys"];
    stepperY->setSpeedInHz(ys);
  }
  if (doc.containsKey("zs"))
  {
    int zs = doc["zs"];
    stepperZ->setSpeedInHz(zs);
  }
  if (doc.containsKey("as"))
  {
    int as = doc["as"];
    stepperA->setSpeedInHz(as);
  }
  return handle_status_request();
}

void handle_stop_request()
{
  server.sendHeader("Access-Control-Allow-Origin", "*");

  stepperX->forceStop();
  stepperY->forceStop();
  stepperZ->forceStop();
  stepperA->forceStop();
  server.send(200, "text/plain", "OK");
}

void handle_not_found()
{
  if (server.method() == HTTP_OPTIONS)
  {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(200);
  }
  else
  {
    server.send(405, "text/plain", "Method Not Allowed");
  }
}

void setup()
{
  engine.init();
  stepperX = engine.stepperConnectToPin(X_PULSE);
  stepperX->setDirectionPin(X_DIR);

  stepperY = engine.stepperConnectToPin(Y_PULSE);
  stepperY->setDirectionPin(Y_DIR);

  stepperZ = engine.stepperConnectToPin(Z_PULSE);
  stepperZ->setDirectionPin(Z_DIR);

  stepperA = engine.stepperConnectToPin(A_PULSE);
  stepperA->setDirectionPin(A_DIR);

  // setup wifi on esp32
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  // Wait for connection
  for (int count = 0; count < 20; count++)
  {
    printWifiStatus();
    if (WiFi.status() == WL_CONNECTED)
      break;
    delay(500);
  }

  if (!MDNS.begin(hostname))
  {
    Serial.println("E Error setting up MDNS responder!");
  }
  else
  {
    Serial.println(String("I mDNS responder started HOSTNAME:") + hostname + ".local");
  }

  stepperX->setSpeedInHz(speed);
  stepperX->setAcceleration(acc);
  stepperX->setAutoEnable(true);

  stepperY->setSpeedInHz(speed);
  stepperY->setAcceleration(acc);
  stepperY->setAutoEnable(true);

  stepperZ->setSpeedInHz(speed);
  stepperZ->setAcceleration(acc);
  stepperZ->setAutoEnable(true);

  stepperA->setSpeedInHz(speed);
  stepperA->setAcceleration(acc);
  stepperA->setAutoEnable(true);

  Serial.begin(115200);

  server.on("/", HTTP_GET, handle_status_request);
  server.on("/", HTTP_POST, handle_update_request);
  server.on("/stop", HTTP_GET, handle_stop_request);
  server.onNotFound(handle_not_found);
  server.begin();

  pinMode(BUILTIN_LED, OUTPUT);
}

String *readLine()
{
  static String result = "";
  static String line = "";
  while (Serial.available())
  {
    char c = Serial.read();
    Serial.write(c);

    if (c == '\n')
    {
      result = line;
      line = "";
      return &result;
    }
    else
    {
      line += c;
    }
  }
  return NULL;
}

const int REPORT_STATUS_EVERY_MS = 100;

void reportStepperStatus(FastAccelStepper *stepper)
{
  auto prefix = "X";
  if (stepper == stepperY)
    prefix = "Y";
  if (stepper == stepperZ)
    prefix = "Z";
  if (stepper == stepperA)
    prefix = "A";
  Serial.println(String("") + prefix + "=" + stepper->getCurrentPosition() +
                 " A" + stepper->getAcceleration() +
                 " S" + stepper->getMaxSpeedInHz());
}

auto CHAR_X = 'X';
auto CHAR_Y = 'Y';
auto CHAR_Z = 'Z';
auto CHAR_A = 'A';

auto CMD_SET_ACCEL = 'A';  // set acceleration
auto CMD_SET_SPEED = 'S';  // set speed
auto CMD_GET_STATUS = '?'; // report status
auto CMD_SET_TARGET = '='; // set target value
auto CMD_WIFI = 'W';       // wifi status

void processCommandForServo(String line, FastAccelStepper *stepper)
{
  auto cmd = line.charAt(0);
  auto value = line.substring(1);

  if (cmd == CMD_GET_STATUS)
  {
    reportStepperStatus(stepper);
    return;
  }

  if (cmd == CMD_SET_ACCEL)
  {
    auto tgt = value.toInt();
    if (tgt > 10)
    {
      acc = tgt;
      stepper->setAcceleration(tgt);
    }
    return;
  }

  if (cmd == CMD_SET_SPEED)
  {
    auto tgt = value.toInt();
    if (tgt > 0)
    {
      speed = tgt;
      stepperX->setSpeedInHz(speed);
    }
    return;
  }

  if (cmd == CMD_SET_TARGET)
  {
    auto tgt = value.toInt();
    stepper->moveTo(tgt);
    return;
  }
}

void processCommand(String *line)
{
  if (line->length() == 0)
    return;

  auto servoSel = line->charAt(0);
  if (servoSel == CHAR_X)
    return processCommandForServo(line->substring(1), stepperX);
  if (servoSel == CHAR_Y)
    return processCommandForServo(line->substring(1), stepperY);
  if (servoSel == CHAR_Z)
    return processCommandForServo(line->substring(1), stepperZ);
  if (servoSel == CHAR_A)
    return processCommandForServo(line->substring(1), stepperA);
  if (servoSel == CMD_WIFI)
    return printWifiStatus();
}

void loop()
{
  server.handleClient();

  String *line = readLine();
  if (line != NULL)
    processCommand(line);

  // print stepper position every .5 seconds
  static unsigned long lastPrint = 0;

  if (!stepperX || !stepperY || !stepperZ || !stepperA)
  {
    return;
  }
  bool xMoving = stepperX->isRunning();
  bool yMoving = stepperY->isRunning();
  bool zMoving = stepperZ->isRunning();
  bool aMoving = stepperA->isRunning();

  bool moving = xMoving || yMoving || zMoving || aMoving;

  if (moving)
  {
    if (millis() - lastPrint > REPORT_STATUS_EVERY_MS)
    {
      lastPrint = millis();
      if (xMoving)
        reportStepperStatus(stepperX);
      if (yMoving)
        reportStepperStatus(stepperY);
      if (zMoving)
        reportStepperStatus(stepperZ);
      if (aMoving)
        reportStepperStatus(stepperA);
    }
  }

  digitalWrite(BUILTIN_LED, moving);

  if (!moving)
  {
    delay(100);
  }
}