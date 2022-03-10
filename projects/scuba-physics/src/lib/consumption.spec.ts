import { Diver } from './Diver';
import { DepthConverter } from './depth-converter';
import { Tank } from './Tanks';
import { Consumption } from './consumption';
import { Time } from './Time';
import { Segment, Segments } from './Segments';
import { OptionExtensions } from './Options.spec';
import { SafetyStop } from './Options';
import { Salinity } from './pressure-converter';

describe('Consumption', () => {
    const diver = new Diver(20, 1.6);
    const consumption = new Consumption(DepthConverter.forFreshWater());
    const options2 = OptionExtensions.createOptions(1, 1, 1.4, 1.6, Salinity.fresh);
    options2.safetyStop = SafetyStop.never;
    options2.problemSolvingDuration = 2;

    describe('Max bottom time', () => {
        const options = OptionExtensions.createOptions(0.4, 0.85, 1.4, 1.6, Salinity.fresh);
        options.safetyStop = SafetyStop.always;
        options.problemSolvingDuration = 2;

        it('Is calculated for default simple plan', () => {
            const tank = new Tank(15, 200, 21);
            const tanks = [tank];

            const segments = new Segments();
            segments.add(0, 30, tank.gas, Time.oneMinute * 0.5);
            segments.addFlat(30, tank.gas, Time.oneMinute * 10.5);

            const maxBottomTime = consumption.calculateMaxBottomTime(segments, tanks, diver, options);
            expect(maxBottomTime).toEqual(17);
        });

        it('Decompression dive is calculated using all tanks', () => {
            const airTank = new Tank(20, 200, 21);
            const ean50Tank = new Tank(10, 200, 50);
            const tanks = [airTank, ean50Tank];

            const segments = new Segments();
            segments.add(0, 40, airTank.gas, Time.oneMinute * 2);
            segments.addFlat(40, airTank.gas, Time.oneMinute);

            const maxBottomTime = consumption.calculateMaxBottomTime(segments, tanks, diver, options);
            expect(maxBottomTime).toEqual(20);
        });

        it('NO Deco dive is calculated using all tanks', () => {
            const airTank = new Tank(20, 85, 21);
            const ean50Tank = new Tank(10, 95, 50);
            const tanks = [airTank, ean50Tank];

            const segments = new Segments();
            segments.add(0, 40, airTank.gas, Time.oneMinute * 2);
            segments.addFlat(40, airTank.gas, Time.oneMinute);

            const maxBottomTime = consumption.calculateMaxBottomTime(segments, tanks, diver, options);
            expect(maxBottomTime).toEqual(5);
        });

        it('0 max time is calculated for plan where defined longer dive than possible', () => {
            const tank = new Tank(15, 200, 21);
            const tanks = [tank];

            const segments = new Segments();
            segments.add(0, 30, tank.gas, Time.oneMinute * 0.5);
            segments.addFlat(30, tank.gas, Time.oneMinute * 23);

            const maxBottomTime = consumption.calculateMaxBottomTime(segments, tanks, diver, options);
            expect(maxBottomTime).toEqual(0);
        });

        it('for long dives is calculated within 200 ms', () => {
            const tank = new Tank(24, 200, 21);
            const tanks = [tank];

            const segments = new Segments();
            segments.add(0, 5, tank.gas, Time.oneMinute);
            segments.addFlat(5, tank.gas, Time.oneMinute * 10);

            const startTime = performance.now();
            consumption.calculateMaxBottomTime(segments, tanks, diver, options);
            const endTime = performance.now();
            const methodDuration = Math.round(endTime - startTime);

            console.log(`Max bottom time duration: ${methodDuration} ms`);
            expect(methodDuration).toBeLessThan(200);
        });

        it('Multilevel dived accept multiple continuing levels', () => {
            const tank = new Tank(24, 200, 21);
            const tanks = [tank];

            const segments = new Segments();
            segments.add(0, 20, tank.gas, Time.oneMinute);
            segments.addFlat(20, tank.gas, Time.oneMinute * 10);
            segments.addFlat(20, tank.gas, Time.oneMinute * 10);

            const maxBottomTime = consumption.calculateMaxBottomTime(segments, tanks, diver, options);
            expect(maxBottomTime).toEqual(49);
        });

        it('Profile ending on surface can consume gas also on surface', () => {
            const tank = new Tank(24, 200, 21);
            const tanks = [tank];

            const segments = new Segments();
            segments.add(0, 10, tank.gas, Time.oneMinute * 10);
            segments.addFlat(10, tank.gas, Time.oneMinute * 10);
            segments.add(10, 0, tank.gas, Time.oneMinute * 10);

            const maxBottomTime = consumption.calculateMaxBottomTime(segments, tanks, diver, options);
            expect(maxBottomTime).toEqual(181);
        });
    });

    describe('Single tank', () => {
        describe('Rock bottom', () => {
            const callConsumption = (tankSize: number, duration: number): Tank => {
                const tank = new Tank(tankSize, 200, 21);
                const tanks = [tank];
                const segments = [
                    new Segment(0, 20, tank.gas, Time.oneMinute),
                    new Segment(20, 20, tank.gas, duration),
                    new Segment(20, 0, tank.gas, 4 * Time.oneMinute)
                ];

                const options = OptionExtensions.createOptions(1, 1, 1.4, 1.6, Salinity.fresh);
                options.safetyStop = SafetyStop.always;
                options.problemSolvingDuration = 2;
                consumption.consumeFromTanks(segments, options, tanks, diver);
                return tank;
            };

            it('Minimum rock bottom is 30 bar', () => {
                const tank = callConsumption(36, Time.oneMinute);
                expect(tank.reserve).toEqual(30); // should be 24 bar
            });

            it('Adds two minutes for solution', () => {
                const tenMinutes = 10 * Time.oneMinute;
                const tank = callConsumption(20, tenMinutes);
                // (3 * 2 * 1) + (2.2 * 1.5 * 1) + (1.3 * 3 * 1) + (1.15 * 0.3 * 1) =
                // (6 + 3.3 + 3.9 + 0.3) * 3 = 42
                expect(tank.reserve).toEqual(42);
            });
        });

        describe('Consumed gas', () => {
            it('Is subtracted from start pressure', () => {
                const tank = new Tank(10, 200, 21);
                const tanks = [tank];
                const profile = [
                    new Segment(0, 20, tank.gas, Time.oneMinute),
                    new Segment(20, 20, tank.gas, 10 * Time.oneMinute),
                    new Segment(20, 0, tank.gas, 2 * Time.oneMinute)
                ];

                // (2b avg depth * 2 bar/min * 1 minutes) + (3b * 2 bar/min * 10 minutes) + (2b * 2 bar/min * 2 minutes)
                consumption.consumeFromTanks(profile, options2, tanks, diver);
                expect(tank.consumed).toEqual(72);
            });
        });
    });

    describe('Multiple tanks', () => {
        describe('1. tank air, 2. tank ean50', () => {
            const airTank = new Tank(20, 200, 21);
            const ean50Tank = new Tank(10, 200, 50);
            const tanks = [airTank, ean50Tank];

            const profile = [
                new Segment(0, 30, airTank.gas, 2 * Time.oneMinute),     // 2.5b * 1 bar/min * 2 minutes = 5b
                new Segment(30, 30, airTank.gas, 10 * Time.oneMinute),   // 4b * 1 bar/min * 10 minutes = 40b
                new Segment(30, 20, airTank.gas, 2 * Time.oneMinute),    // 3.5b * 1 bar/min * 2 minute = 7b
                new Segment(20, 20, ean50Tank.gas, 1 * Time.oneMinute),  // 3b * 2 bar/min * 1 minutes = 6b
                new Segment(20, 0, ean50Tank.gas, 1 * Time.oneMinute)    // 2b * 2 bar/min * 1 minutes = 4b
            ];

            consumption.consumeFromTanks(profile, options2, tanks, diver);

            it('Both tanks are consumed', () => {
                expect(airTank.consumed).toEqual(52);
                expect(ean50Tank.consumed).toEqual(10);
            });

            it('Reserve is updated for both tanks', () => {
                expect(airTank.reserve).toEqual(34); // ((4 b * 1 barm/min * 2 min) + (2.5 b * 1 b/min * 1 min)) * 3
                expect(ean50Tank.reserve).toEqual(45); // ((3 b * 2 barm/min * 1 min) + (2 b * 2 b/min * 2 min)) * 3
            });
        });

        describe('1. tank air, 2. ean50, 3. air - consumed less than from one tank', () => {
            const airTank = new Tank(20, 200, 21);
            const ean50Tank = new Tank(10, 200, 50);
            const airTank2 = new Tank(10, 200, 21);
            const tanks = [airTank, ean50Tank, airTank2];

            const profile = [
                new Segment(0, 30, airTank.gas, 2 * Time.oneMinute),     // 2.5b * 2 bar/min * 2 minutes = 10b
                new Segment(30, 30, airTank.gas, 10 * Time.oneMinute),   // 4b * 2 bar/min * 10 minutes = 80b
                new Segment(30, 20, airTank.gas, 2 * Time.oneMinute),    // 3.5b * 2 bar/min * 2 minute = 14b
                new Segment(20, 20, ean50Tank.gas, 1 * Time.oneMinute),  // 3b * 2 bar/min * 1 minutes = 6b
                new Segment(20, 0, ean50Tank.gas, 1 * Time.oneMinute)    // 2b * 2 bar/min * 1 minutes = 4b
            ];

            consumption.consumeFromTanks(profile, options2, tanks, diver);

            it('Consumption is updated from second tank only', () => {
                expect(airTank.consumed).toEqual(0);
                expect(ean50Tank.consumed).toEqual(10);
                expect(airTank2.consumed).toEqual(103); // rounding
            });
        });

        describe('1. tank air, 2. air, 3. ean50 - consumed from both tanks', () => {
            const airTank = new Tank(20, 200, 21);
            const airTank2 = new Tank(10, 130, 21);
            const ean50Tank = new Tank(10, 100, 50);
            const tanks = [airTank, airTank2, ean50Tank];

            const profile = [
                new Segment(0, 30, airTank.gas, 2 * Time.oneMinute),     // 2.5b * 2 bar/min * 2 minutes = 10b : 2.air
                new Segment(30, 30, airTank.gas, 15 * Time.oneMinute),   // 4b * 2 bar/min * 15 minutes = 120b : 2.air
                new Segment(30, 20, airTank.gas, 2 * Time.oneMinute),    // 3.5b * 1 bar/min * 2 minute = 7b : 1. air
                new Segment(20, 20, ean50Tank.gas, 1 * Time.oneMinute),  // 3b * 2 bar/min * 1 minutes = 6b
                new Segment(20, 0, ean50Tank.gas, 1 * Time.oneMinute)    // 2b * 2 bar/min * 1 minutes = 4b
            ];

            consumption.consumeFromTanks(profile, options2, tanks, diver);

            it('Consumption is updated from both air tanks', () => {
                expect(airTank.consumed).toEqual(7);
                expect(ean50Tank.consumed).toEqual(10);
                expect(airTank2.consumed).toEqual(130);
            });
        });

        describe('Tank not used during dive', () => {
            const airTank = new Tank(10, 200, 21);
            const ean50Tank = new Tank(10, 100, 50);
            const tanks = [airTank, ean50Tank];

            const profile = [
                new Segment(0, 20, airTank.gas, Time.oneMinute),
                new Segment(20, 20, airTank.gas, 10 * Time.oneMinute),
                new Segment(20, 0, airTank.gas, 2 * Time.oneMinute)
            ];

            consumption.consumeFromTanks(profile, options2, tanks, diver);

            it('Consumes only user defined tank', () => {
                expect(airTank.consumed).toEqual(72);
                expect(ean50Tank.consumed).toEqual(0);
            });

            // TODO Consider usage only for user defined tanks
            it('Emergency ascent uses all tanks', () => {
                expect(airTank.reserve).toEqual(30); // minimum
                // 1 min. switch, 2 min. problem solving
                // ((3 * 2 * 3) + (2 * 2 * 2)) * 3
                expect(ean50Tank.reserve).toEqual(78);
            });
        });

        describe('Used tank wasn\'t provided to update consumption', () => {
            const airTank = new Tank(10, 200, 21);
            airTank.reserve = 300;
            const ean50Tank = new Tank(10, 100, 50);
            ean50Tank.reserve = 290;
            const tanks = [ean50Tank];

            const profile = [
                new Segment(0, 20, airTank.gas, Time.oneMinute),
                new Segment(20, 20, airTank.gas, 10 * Time.oneMinute),
                new Segment(20, 0, airTank.gas, 2 * Time.oneMinute)
            ];

            consumption.consumeFromTanks(profile, options2, tanks, diver);

            it('No tank is updated', () => {
                expect(airTank.consumed).toEqual(0);
                expect(ean50Tank.consumed).toEqual(0);
            });

            it('Reserve is not touched', () => {
                expect(airTank.reserve).toEqual(300); // not touched
                expect(ean50Tank.reserve).toEqual(30);
            });
        });

        describe('1. tank air, 2. ean50, 3. ean50 - reserve from both tanks', () => {
            const airTank = new Tank(20, 200, 21);
            const ean50Tank = new Tank(5, 70, 50);
            const ean50Tank2 = new Tank(5, 50, 50);
            const tanks = [airTank, ean50Tank, ean50Tank2];

            const profile = [
                new Segment(0, 30, airTank.gas, 2 * Time.oneMinute),
                new Segment(30, 30, airTank.gas, 15 * Time.oneMinute),  // air relevant only during ascent
                new Segment(30, 20, airTank.gas, 2 * Time.oneMinute),   // 3.5b * 1 bar/min * 2 minute = 7b
                new Segment(20, 20, ean50Tank.gas, 1 * Time.oneMinute), // 3b * 4 bar/min * 1 minutes = 12b
                new Segment(20, 0, ean50Tank.gas, 10 * Time.oneMinute)  // 2b * 4 bar/min * 10 minutes = 80b
            ];

            consumption.consumeFromTanks(profile, options2, tanks, diver);

            it('Reserve is updated from both EAN50 tanks', () => {
                // ((4b * 2 * 1) + (3.5b * 1 min * 1 b/min.)) * 3
                expect(airTank.reserve).toEqual(34);
                // total: ((3b * 4 bar/min * 1 min) + (2 b * 4 bar/min * 2 min)) * 3 = 89 b
                expect(ean50Tank.reserve).toEqual(70);   // full tank as first in order
                expect(ean50Tank2.reserve).toEqual(19);
            });
        });

    });

    describe('Tank assigned to user segment', () => {
        describe('Multiple user defined tanks', () => {
            const airTank = new Tank(20, 100, 21);
            const airTank2 = new Tank(20, 100, 21);
            const ean50Tank = new Tank(10, 200, 50);
            const ean50Tank2 = new Tank(10, 200, 50);
            const tanks = [airTank, airTank2, ean50Tank, ean50Tank2];

            const descent = new Segment(0, 20, ean50Tank.gas, 2 * Time.oneMinute); // ean50 2b * 2 bar/min * 2 minute = 8b
            descent.tank = ean50Tank;
            const swim = new Segment(20, 20, airTank.gas, 20 * Time.oneMinute);  // 3 b * 1 b/min * 20 min = 60b
            swim.tank = airTank;

            const profile = [
                descent,
                swim,
                new Segment(20, 0, ean50Tank2.gas, 4 * Time.oneMinute),   // 2 b * 2 bar/min * 4 minute = 16b
            ];

            consumption.consumeFromTanks(profile, options2, tanks, diver);

            it('Gas is Consumed from required tank', () => {
                expect(airTank.consumed).toEqual(60); // user defined by swim segment
                expect(airTank2.consumed).toEqual(0); // not touched
                expect(ean50Tank.consumed).toEqual(8); // user defined by descent segment
                expect(ean50Tank2.consumed).toEqual(16); // ascent has chosen consume from last in the list
            });

            it('Reserve is not relevant to assigned tanks', () => {
                expect(airTank.reserve).toEqual(30); // minimum reserve always present for first tank
                expect(airTank2.reserve).toEqual(0); // not used
                // 1 minute gas switch to the Ean50 + 2 min. problem solving
                // ((3 * 2 * 3) + (2 * 2 * 2)) * 3 => 78
                expect(ean50Tank.reserve).toEqual(78); // used during ascent as rock bottom
                expect(ean50Tank2.reserve).toEqual(0); // not used
            });
        });

        describe('Single user defined tank', () => {
            const airTank = new Tank(20, 100, 21);
            const tanks = [airTank];

            const descent = new Segment(0, 20, airTank.gas, 2 * Time.oneMinute); // 2 b * 1 bar/min * 2 minute = 4b
            descent.tank = airTank;
            const swim = new Segment(20, 20, airTank.gas, 40 * Time.oneMinute);  // 3 b * 1 b/min * 40 min = 120b
            swim.tank = airTank;

            const profile = [
                descent,
                swim,
                new Segment(20, 0, airTank.gas, 4 * Time.oneMinute),   // 2 b * 1 bar/min * 4 minute = 8b
            ];

            consumption.consumeFromTanks(profile, options2, tanks, diver);

            it('Reserve is more than remaining', () => {
                expect(airTank.reserve).toEqual(30); // ((3 * 2 * 1) + (2.5 * 2 * 1)) * 3
                expect(airTank.consumed).toEqual(100); // up to the limit
            });
        });

        describe('Only user defined segments', () => {
            const options3 = OptionExtensions.createOptions(1, 1, 1.4, 1.6, Salinity.fresh);
            options3.problemSolvingDuration = 2;

            const airTank = new Tank(20, 100, 21);
            const tanks = [airTank];

            const descent = new Segment(0, 20, airTank.gas, 2 * Time.oneMinute); // 2 b * 1 bar/min * 2 minute = 4b
            descent.tank = airTank;
            const swim = new Segment(20, 20, airTank.gas, 40 * Time.oneMinute);  // 3 b * 1 b/min * 40 min = 120b
            swim.tank = airTank;
            const ascent = new Segment(20, 0, airTank.gas, 4 * Time.oneMinute);   // 2 b * 1 bar/min * 4 minute = 8b
            ascent.tank = airTank;

            const profile = [descent, swim, ascent];
            consumption.consumeFromTanks(profile, options3, tanks, diver);

            it('Tank is updated as with calculated segments', () => {
                expect(airTank.reserve).toEqual(42); // 3 min at 3 m + 2 min. solving
                expect(airTank.consumed).toEqual(100); // up to the limit
            });
        });
    });

    describe('User defined segments', () => {
        it('Plan ends at surface', () => {
            const tank = new Tank(10, 200, 21);
            const tanks = [tank];

            const first = new Segment(0, 10, tank.gas, Time.oneMinute * 10);
            const second = new Segment(10, 0, tank.gas, Time.oneMinute * 10);
            const segments = [first, second];
            // 1.5 * 20 * 2 = 60

            consumption.consumeFromTanks(segments, options2, tanks, diver);
            expect(tank.consumed).toEqual(61); //  because of pressure conversion
            // emergency ascent: ((2 * 2 * 2) + (1.5 * 1 * 2)) * 3 = 33
            expect(tank.reserve).toEqual(33);
        });

        it('As part of ascent counts to rock bottom', () => {
            const tank1 = new Tank(20, 200, 21);
            const tank2 = new Tank(10, 200, 50);
            const tanks = [tank1, tank2];

            const first = new Segment(0, 40, tank1.gas, Time.oneMinute * 4); // 3 * 4 * 1 = 12
            first.tank = tank1;
            const second = new Segment(40, 40, tank1.gas, Time.oneMinute * 13); // 5 * 13 * 1 = 65
            second.tank = tank1;
            const third = new Segment(40, 6, tank1.gas, Time.oneMinute * 10); // 3,3 * 10 * 1 = 33
            third.tank = tank1;
            const safety = new Segment(6, 6, tank2.gas, Time.oneMinute * 8); // 1,6 * 8 * 2 = 25,6
            const ascent = new Segment(6, 0, tank2.gas, Time.oneMinute * 2); // 1,3 * 2 * 2 = 5,2
            const segments = [first, second, third, safety, ascent];

            // currently tank1 30/90,  tank2 112/169 (reserve/remaining)
            // should be tank1 129/90, tank2 94/169
            consumption.consumeFromTanks(segments, options2, tanks, diver);
            // ((5 * 2 * 1) + (4 * 1.9 * 1)) * 3
            expect(tank1.reserve).toEqual(53);
            // ((3 * 1 * 2) + (2.15 * 1.8 * 2) + (1.3 * 1.4 * 2) + (1.15 * .3 * 2)) * 3
            expect(tank2.reserve).toEqual(56);
        });

        // TODO Add test to events, that we need show also user defined gas switch to other tank even with the same gas
        // 40 m/20 minutes on first tank only. Tanks: 24/200/.21, 11/200/.21

        it('Shallower, than deeper - last deepest point used for emergency ascent', () => {
            const tank1 = new Tank(20, 200, 21);
            const tanks = [tank1];

            const profile = [
                new Segment(0, 20, tank1.gas, Time.oneMinute * 2),
                new Segment(20, 20, tank1.gas, Time.oneMinute * 10),
                new Segment(20, 10, tank1.gas, Time.oneMinute * 1),
                new Segment(10, 10, tank1.gas, Time.oneMinute * 10),
                new Segment(10, 30, tank1.gas, Time.oneMinute * 2),
                new Segment(30, 30, tank1.gas, Time.oneMinute * 2),
                new Segment(30, 10, tank1.gas, Time.oneMinute * 2),  // 3 * 1 * 2 = 6
                new Segment(10, 10, tank1.gas, Time.oneMinute * 10), // 2 * 1 * 10 = 20
                new Segment(10, 0, tank1.gas, Time.oneMinute * 1)    // 1.5 * 1 * 1 = 1.5
            ];

            // reserve - ascent from 6. segment = ((4 bar * 1 bar/min * 2 min) + (2.5 b * 1 bar/min * 3 min)) * 3
            consumption.consumeFromTanks(profile, options2, tanks, diver);
            expect(tank1.reserve).toEqual(47);
        });

        it('The same deep depths - last deepest point used for emergency ascent', () => {
            const tank1 = new Tank(20, 200, 21);
            const tanks = [tank1];

            const profile = [
                new Segment(0, 20, tank1.gas, Time.oneMinute * 2),
                new Segment(20, 20, tank1.gas, Time.oneMinute * 10),
                new Segment(20, 10, tank1.gas, Time.oneMinute * 1),
                new Segment(10, 10, tank1.gas, Time.oneMinute * 10),
                new Segment(10, 20, tank1.gas, Time.oneMinute * 1),
                new Segment(20, 20, tank1.gas, Time.oneMinute * 10),
                new Segment(20, 10, tank1.gas, Time.oneMinute * 1),  // 2.5 * 1 * 1 =2.5
                new Segment(10, 10, tank1.gas, Time.oneMinute * 10), // 2 * 1 * 10 = 20
                new Segment(10, 0, tank1.gas, Time.oneMinute * 1)   // 1.5 * 1 * 1 = 1.5
            ];

            // reserve - ascent from 6. segment = ((3 b * 1 bar/min * 2 min) + (2 b * 1 bar/min * 2 min)) * 3
            consumption.consumeFromTanks(profile, options2, tanks, diver);
            expect(tank1.reserve).toEqual(30);
        });

        it('Deeper, than shallower - last segment in depth is used for reserve', () => {
            const tank1 = new Tank(20, 200, 21);
            const tanks = [tank1];

            const profile = [
                new Segment(0, 30, tank1.gas, Time.oneMinute * 3),
                new Segment(30, 30, tank1.gas, Time.oneMinute * 10), // reserve count from emergency ascent here
                new Segment(30, 10, tank1.gas, Time.oneMinute * 1),
                new Segment(10, 10, tank1.gas, Time.oneMinute * 10),
                new Segment(10, 20, tank1.gas, Time.oneMinute * 1),
                new Segment(20, 20, tank1.gas, Time.oneMinute * 10),
                new Segment(20, 0, tank1.gas, Time.oneMinute * 3)
            ];

            // reserve - ascent from 2. segment
            // ((4 b * 2 min * 1 bar/min) + (2.5 b * 3 min * 1 bar/min)) * 3
            consumption.consumeFromTanks(profile, options2, tanks, diver);
            expect(tank1.reserve).toEqual(47);
        });

        // TODO documentation: How reserve for all usable is calculated
        // 1. Simple UI - Ascent is calculated and is from deepest point - we can count with it
        // 2. Complex multilevel dive with or without user segments up to the surface
        //    - based on deco and all available gases, even the gases aren't used in
        //      any user defined segment - emergency ascent from last deepest point
        // TODO Consider use user defined segments for emergency ascent
        // Hidden to user: From which point to calculate rock bottom and subtract it before strategy is calculated?
        //    - 1/2 usable strategy
        //    - 1/3 usable strategy

        describe('Multiple tanks with the same gas', () => {
            // 4. Multiple tanks of the same gas, reserve is counted form first bellow reserve and second tank is not utilized
            // TODO Add to documentation: this is correct scenario, user is informed, that he needs to switch
            //  and therefore needs to use new segment and enforce usage of different tank
            it('reserve counts always from first tank', () => {
                // The same as 'As part of ascent counts to rock bottom', but different 02 content in second tank
                const tank1 = new Tank(20, 200, 21);
                const tank2 = new Tank(10, 200, 21);
                const tanks = [tank1, tank2];

                const s1 = new Segment(0, 40, tank1.gas, Time.oneMinute * 4);
                s1.tank = tank1;
                const s2 = new Segment(40, 40, tank1.gas, Time.oneMinute * 13);
                s2.tank = tank1;
                const s3 = new Segment(40, 6, tank1.gas, Time.oneMinute * 10); // 3,3 * 10 * 1 = 33
                s3.tank = tank1;
                // next segments don't have tank assigned, so the first one still will be used
                // ascent counts with stop at 3m even user defined in 6 m
                const s4 = new Segment(6, 6, tank1.gas, Time.oneMinute * 8); // 1,6 * 8 * 1 = 12.8
                const s5 = new Segment(6, 0, tank1.gas, Time.oneMinute * 2); // 1,3 * 2 * 1 = 2.6
                const profile = [s1, s2, s3, s4, s5];

                consumption.consumeFromTanks(profile, options2, tanks, diver);
                // ((5 b * 2 min * 1 bar/min) + (3.15 b * 3.7 min * 1) + (1.3 b * 3.25 min * 1) + (1.15 b * .3 min * 1)) * 3
                // (10 + 11.7 + 4.3 + .4) * 3
                expect(tank1.reserve).toEqual(79);
                expect(tank2.reserve).toEqual(0);
            });

            describe('user defined tanks', () => {
                const tank1 = new Tank(20, 200, 21);
                const tank2 = new Tank(10, 200, 21);
                const tanks = [tank1, tank2];

                const s1 = new Segment(0, 40, tank1.gas, Time.oneMinute * 4); // 3 * 4 * 1 = 12
                s1.tank = tank1;
                const s2 = new Segment(40, 40, tank1.gas, Time.oneMinute * 13); // 5 * 13 * 1 = 65
                s2.tank = tank1;
                const s3 = new Segment(40, 6, tank1.gas, Time.oneMinute * 10); // 3,3 * 10 * 1 = 33
                s3.tank = tank1;
                const s4 = new Segment(6, 6, tank1.gas, Time.oneMinute * 8); // 1.6 * 8 * 2 = 25.6
                s4.tank = tank2;
                const s5 = new Segment(6, 0, tank1.gas, Time.oneMinute * 2); // 1.3 * 2 * 2 = 5.2
                s5.tank = tank2;
                const segments = [s1, s2, s3, s4, s5];

                consumption.consumeFromTanks(segments, options2, tanks, diver);

                it('counts the consumption', () => {
                    expect(tank1.consumed).toEqual(110);
                    expect(tank2.consumed).toEqual(32); // depth rounding
                });

                it('counts the reserve', () => {
                    // see 'reserve counts always from first tank'. the user defined segments aren't used
                    expect(tank1.reserve).toEqual(79);
                    expect(tank2.reserve).toEqual(0);
                });
            });
        });
    });
});
