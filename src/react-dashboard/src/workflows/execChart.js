import * as d3 from 'd3';
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

const AxisTop = ({ domain = [0, 100], range = [10, 290], ...otherAttrs }) => {
    const ticks = useMemo(() => {
        const xScale = d3
            .scaleLinear()
            .domain(domain)
            .range(range);

        const width = range[1] - range[0];
        const pixelsPerTick = 50;
        const numberOfTicksTarget = Math.max(
            1,
            Math.floor(width / pixelsPerTick),
        );

        return xScale.ticks(numberOfTicksTarget).map((value) => ({
            value,
            xOffset: xScale(value),
        }));
    }, [domain, range]);

    return (
        <g transform="translate(30 0)" {...otherAttrs}>
            <path
                d={['M', range[0], 25, 'v', 6, 'H', range[1], 'v', -6].join(
                    ' ',
                )}
                fill="none"
                stroke="currentColor"
            />
            {ticks.map(({ value, xOffset }) => (
                <g key={value} transform={`translate(${xOffset}, 0)`}>
                    <line y1="25" y2="31" stroke="currentColor" />
                    <text
                        key={value}
                        style={{
                            fontSize: '10px',
                            textAnchor: 'middle',
                            transform: 'translateY(20px)',
                        }}
                    >
                        {new Date(value).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </text>
                </g>
            ))}
        </g>
    );
};
AxisTop.propTypes = {
    domain: PropTypes.arrayOf(PropTypes.number),
    range: PropTypes.arrayOf(PropTypes.number),
};

export const ExecutionChart = ({ workflowCalls, width = 1000 }) => {
    // workflowCalls = [
    //     {
    //         start,
    //         end,
    //         calls: [
    //             {
    //                 start,
    //                 end,
    //                 callName,
    //                 shards: [[shardIndex, events], ...]
    //             },
    //             ...
    //         ]
    //     }
    // ]

    const cumShardCount = workflowCalls.calls.map(
        ((cumSum) => (call) => (cumSum += call.shards.length))(0),
    );
    const maxCallNameLength = Math.max.apply(
        null,
        workflowCalls.calls.map((call) => call.callName.length),
    );
    // add 2 characters for shard index
    const labelWidth = (maxCallNameLength + 2) * 9;
    // Leave 30px space for top and bottom axes
    const height = cumShardCount[cumShardCount.length - 1] * 25 + 30 + 30;
    const plotSize = {
        width: width - 30 - labelWidth - 30,
        height: height - 30 - 30,
        marginLeft: 30 + labelWidth,
        marginTop: 30,
    };
    const x = d3
        .scaleLinear()
        .domain([workflowCalls.start, workflowCalls.end])
        .range([0, plotSize.width]);
    const y = d3
        .scaleBand()
        .domain(d3.range(cumShardCount[cumShardCount.length - 1]))
        .range([0, plotSize.height])
        .padding(0.5);

    return (
        <svg width={width} height={height}>
            <AxisTop
                domain={[workflowCalls.start, workflowCalls.end]}
                range={[0, plotSize.width]}
                transform={`translate(${plotSize.marginLeft} 0)`}
            />

            <g
                transform={`translate(${plotSize.marginLeft} ${plotSize.marginTop})`}
            >
                {workflowCalls.calls.map((call, i) => (
                    <g key={call.callName}>
                        {i % 2 === 1 ? (
                            <g
                                transform={`translate(0, ${y(
                                    cumShardCount[i - 1] || 0,
                                ) -
                                    (y.step() * y.padding()) / 2})`}
                            >
                                <rect
                                    x={0}
                                    height={y.step() * call.shards.length}
                                    width={plotSize.width}
                                    fill="#e2e2e2"
                                />
                            </g>
                        ) : null}
                        {call.shards.map(([shardIndex, events], j) => (
                            <g
                                key={j}
                                transform={`translate(0 ${y(
                                    (cumShardCount[i - 1] || 0) + j,
                                )})`}
                            >
                                {events.map((event, k) => (
                                    <rect
                                        key={k}
                                        x={x(event.start)}
                                        height={y.bandwidth()}
                                        width={x(event.end) - x(event.start)}
                                        fill={d3.interpolateRainbow(
                                            k / (events.length - 1),
                                        )}
                                    />
                                ))}
                                <text
                                    x={-10}
                                    y={0}
                                    fill="black"
                                    dominantBaseline="hanging"
                                    textAnchor="end"
                                >
                                    {call.callName}
                                    {call.shards.length > 1
                                        ? `.${shardIndex}`
                                        : null}
                                </text>
                            </g>
                        ))}
                    </g>
                ))}
            </g>
        </svg>
    );
};
ExecutionChart.propTypes = {
    workflowCalls: PropTypes.shape({
        start: PropTypes.number.isRequired,
        end: PropTypes.number.isRequired,
        calls: PropTypes.arrayOf(
            PropTypes.shape({
                start: PropTypes.number.isRequired,
                end: PropTypes.number.isRequired,
                shards: PropTypes.arrayOf(PropTypes.array).isRequired,
            }),
        ).isRequired,
    }).isRequired,
    width: PropTypes.number,
};
