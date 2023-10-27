#include <Arduino.h>
#include <AccelStepper.h>
#include <WiFi.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <ArduinoJson.h>

auto const X_PULSE = 26;
auto const X_DIR = 25;

auto const Y_PULSE = 4;
auto const Y_DIR = 2;

auto const Z_PULSE = 16;
auto const Z_DIR = 17;

auto const A_PULSE = 5;
auto const A_DIR = 18;

AccelStepper stepperX = AccelStepper(1, X_PULSE, X_DIR);
AccelStepper stepperY = AccelStepper(1, Y_PULSE, Y_DIR);
AccelStepper stepperZ = AccelStepper(1, Z_PULSE, Z_DIR);
AccelStepper stepperA = AccelStepper(1, A_PULSE, A_DIR);

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
  server.send(200, "application/json",
              String("{") +
                  "\"x\":" + stepperX.currentPosition() + "," +
                  "\"y\":" + stepperY.currentPosition() + "," +
                  "\"z\":" + stepperZ.currentPosition() + "," +
                  "\"a\":" + stepperA.currentPosition() + "," +
                  "\"xrunning\":" + (int)stepperX.isRunning() + "," +
                  "\"yrunning\":" + (int)stepperY.isRunning() + "," +
                  "\"zrunning\":" + (int)stepperZ.isRunning() + "," +
                  "\"arunning\":" + (int)stepperA.isRunning() + "," +
                  "\"acc\":" + acc + "," +
                  "\"speed\":" + speed + "}");
}

void handle_update_request()
{
  String body = server.arg("plain");
  Serial.println("Received body: " + body);

  // Parse the JSON data
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, body);

  // Check for parsing errors
  if (error)
  {
    Serial.print("JSON parsing error: ");
    Serial.println(error.c_str());
    server.send(400, "text/plain", "Bad Request");
    return;
  }

  if (doc.containsKey("x"))
  {
    int x = doc["x"];
    stepperX.moveTo(x);
  }
  if (doc.containsKey("y"))
  {
    int y = doc["y"];
    stepperY.moveTo(y);
  }
  if (doc.containsKey("z"))
  {
    int z = doc["z"];
    stepperZ.moveTo(z);
  }
  if (doc.containsKey("a"))
  {
    int a = doc["a"];
    stepperA.moveTo(a);
  }
  if (doc.containsKey("acc"))
  {
    int a = doc["acc"];
    acc = a;
    stepperX.setAcceleration(acc);
    stepperY.setAcceleration(acc);
    stepperZ.setAcceleration(acc);
    stepperA.setAcceleration(acc);
  }
  if (doc.containsKey("speed"))
  {
    int s = doc["speed"];
    speed = s;
    stepperX.setMaxSpeed(speed);
    stepperY.setMaxSpeed(speed);
    stepperZ.setMaxSpeed(speed);
    stepperA.setMaxSpeed(speed);
  }

  return handle_status_request();
}

void setup()
{
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

  stepperX.setMaxSpeed(speed);
  stepperX.setAcceleration(acc);

  stepperY.setMaxSpeed(speed);
  stepperY.setAcceleration(acc);

  stepperZ.setMaxSpeed(speed);
  stepperZ.setAcceleration(acc);

  stepperA.setMaxSpeed(speed);
  stepperA.setAcceleration(acc);

  Serial.begin(115200);

  server.on("/", HTTP_GET, handle_status_request);
  server.on("/", HTTP_POST, handle_update_request);
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

void reportStepperStatus(AccelStepper &stepper)
{
  auto prefix = (&stepper == &stepperX) ? "X" : "Y";
  Serial.println(String("") + prefix + "=" + stepper.currentPosition() +
                 " A" + stepper.acceleration() +
                 " S" + stepper.maxSpeed());
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

void processCommandForServo(String line, AccelStepper &stepper)
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
      stepperX.setAcceleration(tgt);
      stepperY.setAcceleration(tgt);
      stepperZ.setAcceleration(tgt);
      stepperA.setAcceleration(tgt);
    }
    return;
  }

  if (cmd == CMD_SET_SPEED)
  {
    auto tgt = value.toInt();
    if (tgt > 0)
    {
      speed = tgt;
      stepperX.setMaxSpeed(speed);
      stepperY.setMaxSpeed(speed);
      stepperZ.setMaxSpeed(speed);
      stepperA.setMaxSpeed(speed);
    }
    return;
  }

  if (cmd == CMD_SET_TARGET)
  {
    auto tgt = value.toInt();
    stepper.moveTo(tgt);
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

  bool xMoving = stepperX.isRunning();
  bool yMoving = stepperY.isRunning();
  bool zMoving = stepperZ.isRunning();
  bool aMoving = stepperA.isRunning();

  bool moving = xMoving || yMoving || zMoving || aMoving;

  if (xMoving)
  {
    stepperX.run();
    if (stepperX.distanceToGo() == 0)
    {
      lastPrint = 0; // force print when done moving
    }
  }

  if (yMoving)
  {
    stepperY.run();
    if (stepperY.distanceToGo() == 0)
    {
      lastPrint = 0; // force print when done moving
    }
  }

  if (zMoving)
  {
    stepperZ.run();
    if (stepperZ.distanceToGo() == 0)
    {
      lastPrint = 0; // force print when done moving
    }
  }

  if (aMoving)
  {
    stepperA.run();
    if (stepperA.distanceToGo() == 0)
    {
      lastPrint = 0; // force print when done moving
    }
  }

  if (moving)
  {
    if (millis() - lastPrint > REPORT_STATUS_EVERY_MS)
    {
      lastPrint = millis();
      if (xMoving)
        reportStepperStatus(stepperX);
      if (yMoving)
        reportStepperStatus(stepperY);
    }
  }

  digitalWrite(BUILTIN_LED, moving);

  if (!moving)
  {
    delay(100);
  }
}