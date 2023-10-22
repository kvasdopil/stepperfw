#include <Arduino.h>
#include <AccelStepper.h>

auto PULSE1 = D5;
auto DIR1 = D6;

auto PULSE2 = D1;
auto DIR2 = D0;

AccelStepper stepperX = AccelStepper(1, PULSE1, DIR1);
AccelStepper stepperY = AccelStepper(1, PULSE2, DIR2);

void setup()
{
  stepperX.setMaxSpeed(1500);
  stepperX.setAcceleration(500);

  stepperY.setMaxSpeed(1500);
  stepperY.setAcceleration(500);
  // stepper1.moveTo(24);

  Serial.begin(115200);
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

int perDegreeX = 1;
int perDegreeY = 1;
const float STEPS_PER_1_DEGREE = (10000 / 360);
const int REPORT_STATUS_EVERY_MS = 100;

void reportStepperStatus(AccelStepper &stepper)
{
  auto prefix = (&stepper == &stepperX) ? "X" : "Y";
  auto perDegree = (&stepper == &stepperX) ? perDegreeX : perDegreeY;
  Serial.println(String("") + prefix + "=" + (stepper.currentPosition() / (perDegree * STEPS_PER_1_DEGREE)) +
                 String(" A") + stepper.acceleration() +
                 String(" S") + stepper.maxSpeed() +
                 String(" P") + perDegree);
}

auto CHAR_0 = String("X").charAt(0);
auto CHAR_1 = String("Y").charAt(0);

auto CMD_SET_ACCEL = String("A").charAt(0);            // set acceleration
auto CMD_SET_SPEED = String("S").charAt(0);            // set speed
auto CMD_GET_STATUS = String("?").charAt(0);           // report status
auto CMD_SET_TARGET = String("=").charAt(0);           // set target value
auto CMD_SET_STEPS_PER_DEGREE = String("P").charAt(0); // set steps per degree

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
    auto tgt = value.toFloat();
    if (tgt > 10)
    {
      stepper.setAcceleration(tgt);
    }
    return;
  }

  if (cmd == CMD_SET_SPEED)
  {
    auto tgt = value.toFloat();
    if (tgt > 0)
    {
      stepper.setMaxSpeed(tgt);
    }
    return;
  }

  if (cmd == CMD_SET_TARGET)
  {
    // Serial.println(String("moving x: ") + value);
    auto tgt = value.toFloat();
    auto perDegree = (&stepper == &stepperX) ? perDegreeX : perDegreeY;
    stepper.moveTo(tgt * perDegree * STEPS_PER_1_DEGREE);
    return;
  }

  if (cmd == CMD_SET_STEPS_PER_DEGREE)
  {
    auto tgt = value.toInt();
    if (tgt > 0)
    {
      if (&stepper == &stepperX)
        perDegreeX = tgt;
      else
        perDegreeY = tgt;
    }
    return;
  }
}

void processCommand(String *line)
{
  if (line->length() == 0)
    return;

  auto servoSel = line->charAt(0);
  if (servoSel == CHAR_0)
    return processCommandForServo(line->substring(1), stepperX);
  if (servoSel == CHAR_1)
    return processCommandForServo(line->substring(1), stepperY);
}

void loop()
{
  String *line = readLine();
  if (line != NULL)
    processCommand(line);

  // print stepper position every .5 seconds
  static unsigned long lastPrint = 0;
  static bool xWasMoving = false;
  static bool yWasMoving = false;

  bool xMoving = stepperX.distanceToGo() != 0;
  bool yMoving = stepperY.distanceToGo() != 0;
  if (xMoving || yMoving)
  {
    xWasMoving = xMoving;
    yWasMoving = yMoving;
    if (millis() - lastPrint > REPORT_STATUS_EVERY_MS)
    {
      lastPrint = millis();
      if (xMoving)
        reportStepperStatus(stepperX);
      if (yMoving)
        reportStepperStatus(stepperY);
    }
  }
  else if (xWasMoving || yWasMoving)
  {
    // print final position
    if (xWasMoving)
    {
      reportStepperStatus(stepperX);
      xWasMoving = false;
    }
    if (yWasMoving)
    {
      reportStepperStatus(stepperY);
      yWasMoving = false;
    }
  }

  stepperX.run();
  stepperY.run();
}