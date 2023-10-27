#include <Arduino.h>
#include <AccelStepper.h>

auto const X_PULSE = 26;
auto const X_DIR = 25;

auto const Y_PULSE = 4;
auto const Y_DIR = 2;

AccelStepper stepperX = AccelStepper(1, X_PULSE, X_DIR);
AccelStepper stepperY = AccelStepper(1, Y_PULSE, Y_DIR);

void setup()
{
  digitalWrite(D0, HIGH);
  // digitalWrite(D0, LOW);

  stepperX.setMaxSpeed(1500);
  stepperX.setAcceleration(500);

  stepperY.setMaxSpeed(1500);
  stepperY.setAcceleration(500);
  // stepper1.moveTo(24);

  Serial.begin(115200);

  // pinMode(BUILTIN_LED, OUTPUT);
  // digitalWrite(BUILTIN_LED, LOW);
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

int perRevolutionX = 10000;
int perPevolutionY = 10000;
const int REPORT_STATUS_EVERY_MS = 100;

void reportStepperStatus(AccelStepper &stepper)
{
  auto prefix = (&stepper == &stepperX) ? "X" : "Y";
  auto perRevo = (&stepper == &stepperX) ? perRevolutionX : perPevolutionY;
  Serial.println(String("") + prefix + "=" + (stepper.currentPosition() / (float)perRevo) * 360.0 +
                 String(" A") + stepper.acceleration() +
                 String(" S") + stepper.maxSpeed() +
                 String(" P") + perRevo);
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
    auto perRevo = (&stepper == &stepperX) ? perRevolutionX : perPevolutionY;
    stepper.moveTo(tgt * (float)perRevo / 360.0);
    return;
  }

  if (cmd == CMD_SET_STEPS_PER_DEGREE)
  {
    auto tgt = value.toInt();
    if (tgt > 0)
    {
      if (&stepper == &stepperX)
        perRevolutionX = tgt;
      else
        perPevolutionY = tgt;
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

  bool xMoving = stepperX.isRunning();
  bool yMoving = stepperY.isRunning();

  // if (xMoving || yMoving)
  // {
  //   if (millis() - lastPrint > REPORT_STATUS_EVERY_MS)
  //   {
  //     lastPrint = millis();
  //     if (xMoving)
  //       reportStepperStatus(stepperX);
  //     if (yMoving)
  //       reportStepperStatus(stepperY);
  //   }
  // }

  if (xMoving || yMoving)
  {
    // digitalWrite(BUILTIN_LED, HIGH);
  }

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

  if (xMoving || yMoving)
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

  if (!yMoving && !xMoving)
  {
    // digitalWrite(BUILTIN_LED, HIGH);
    delay(100);
  }

  //   // print final position
  //   if (xWasMoving)
  //   {
  //     Serial.println("lastX");
  //     reportStepperStatus(stepperX);
  //     xWasMoving = false;
  //   }
  //   if (yWasMoving)
  //   {
  //     Serial.println("lastY");
  //     reportStepperStatus(stepperY);
  //     yWasMoving = false;
  //   }
  // }
}