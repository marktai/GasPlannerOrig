import { PressureConverter, VapourPressure, Gravity, AltitudePressure } from './pressure-converter';

describe('Pressure', () => {
  describe('Pressure Converter', () => {
    it('315700 pascals converts to 3.157 bar', () => {
      const result = PressureConverter.pascalToBar(315700);
      expect(result).toBeCloseTo(3.157, 3);
    });

    it('3.157 converts to 315700 pascals', () => {
      const result = PressureConverter.barToPascal(3.157);
      expect(result).toBeCloseTo(315700);
    });
  });

  describe('Vapour pressure', () => {
    it('0°C results in out of range', () => {
      expect(() => VapourPressure.waterVapourPressureInBars(0)).toThrow();
    });

    it('1°C corresponds to 0.00651 bar', () => {
      const result = VapourPressure.waterVapourPressureInBars(1);
      expect(result).toBeCloseTo(0.00651, 5);
    });

    it('35.2°C corresponds to 0.056714 bar', () => {
      const result = VapourPressure.waterVapourPressureInBars(35.2);
      expect(result).toBeCloseTo(0.056714, 5);
    });

    it('99°C corresponds to 0.97758 bar', () => {
      const result = VapourPressure.waterVapourPressureInBars(99);
      expect(result).toBeCloseTo(0.97758, 5);
    });

    it('100°C corresponds to 1.01334 bar', () => {
      const result = VapourPressure.waterVapourPressureInBars(100);
      expect(result).toBeCloseTo(1.013365, 5);
    });

    it('374°C corresponds to 217.3 bar', () => {
      const result = VapourPressure.waterVapourPressureInBars(374);
      expect(result).toBeCloseTo(217.30381, 5);
    });

    it('376°C corresponds to out of range', () => {
      expect(() => VapourPressure.waterVapourPressureInBars(376)).toThrow();
    });
  });

  describe('Gravity', () => {
    it('At sea level is 9.807', () => {
      const gravity = Gravity.atAltitude(0);
      expect(gravity).toBeCloseTo(9.80665, 5);
    });

    it('At 1000 m a.s.l. is 9.804', () => {
      const gravity = Gravity.atAltitude(1000);
      expect(gravity).toBeCloseTo(9.80357, 5);
    });

    it('At 3000 m a.s.l. is 9.798', () => {
      const gravity = Gravity.atAltitude(3000);
      expect(gravity).toBeCloseTo(9.79742, 5);
    });
  });

  describe('Altitude pressure', () => {
    it('At sea level is 10325 Pa', () => {
      const gravity = AltitudePressure.atAltitude(0);
      expect(gravity).toBeCloseTo(101325);
    });

    it('400 level is 96611 Pa', () => {
      const gravity = AltitudePressure.atAltitude(400);
      expect(gravity).toBeCloseTo(96611, 0);
    });

    it('1000 level is 89875 Pa', () => {
      const gravity = AltitudePressure.atAltitude(1000);
      expect(gravity).toBeCloseTo(89875, 0);
    });

    it('2000 level is 79495 Pa', () => {
      const gravity = AltitudePressure.atAltitude(2000);
      expect(gravity).toBeCloseTo(79495, 0);
    });

    it('3000 level is 70109 Pa', () => {
      const gravity = AltitudePressure.atAltitude(3000);
      expect(gravity).toBeCloseTo(70109, 0);
    });
  });
});
