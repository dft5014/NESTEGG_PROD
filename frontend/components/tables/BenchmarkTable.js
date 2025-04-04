import React from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

// Row Component for Sortable Item
const SortableItem = ({ id, item, timePeriods, onChartOpen, onRemoveItem, renderTrend, timeframeToChangeKey }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging, // Add isDragging state
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1, // Reduce opacity when dragging
        zIndex: isDragging ? 10 : 'auto', // Ensure dragging item is on top
        cursor: isDragging ? 'grabbing' : 'default', // Change cursor while dragging
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`border-b border-gray-700 ${isDragging ? 'bg-gray-700 shadow-lg' : 'hover:bg-gray-700/50'} transition-colors group`}
        >
            {/* Drag Handle */}
            <td className="py-3 px-2 text-center">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab p-2 text-gray-500 hover:text-white focus:outline-none"
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="w-5 h-5" />
                </button>
            </td>

            {/* Name & Symbol */}
            <td className="py-3 px-4">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-400">{item.symbol !== 'NEST_EGG' ? item.symbol : ''}</div>
            </td>

            {/* Price */}
            <td className="py-3 px-4 text-right font-medium">
                {item.price}
            </td>

            {/* Trend Columns */}
            {timePeriods.map(period => (
                <td
                    key={period.id}
                    className="py-3 px-4 text-right cursor-pointer hover:bg-blue-900/30 transition-colors"
                    onClick={() => onChartOpen(item.symbol, item.name, period.id)}
                    title={`Click to view ${item.name} ${period.label} chart`}
                >
                    {renderTrend(item[timeframeToChangeKey(period.id)])}
                </td>
            ))}

            {/* Actions (Remove) */}
             <td className="py-3 px-4 text-center">
                {item.isRemovable ? (
                    <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none"
                        title={`Remove ${item.name}`}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                ) : (
                     <div className="w-4 h-4 inline-block"></div> // Placeholder for alignment
                 )}
            </td>
        </tr>
    );
};


// Main Table Component
const BenchmarkTable = ({ items, timePeriods, isLoading, onChartOpen, onRemoveItem, renderTrend, timeframeToChangeKey }) => {

    if (isLoading) {
        return <div className="text-center text-gray-400 py-8">Loading market data...</div>;
    }

    if (!items || items.length === 0) {
         return <div className="text-center text-gray-400 py-8">No benchmarks added yet. Click 'Add' below.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead>
                    <tr className="border-b border-gray-600">
                        <th className="py-3 px-2 w-10"> {/* Handle Col */}</th>
                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-300">Benchmark</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-gray-300">Price</th>
                        {timePeriods.map(period => (
                             <th key={period.id} className="py-3 px-4 text-right text-sm font-semibold text-gray-300">{period.label}</th>
                        ))}
                        <th className="py-3 px-4 w-12 text-center text-sm font-semibold text-gray-300"> {/* Actions Col */}</th>
                    </tr>
                </thead>
                 {/* Use tbody directly for SortableContext */}
                <tbody>
                    {items.map((item) => (
                        <SortableItem
                            key={item.id}
                            id={item.id}
                            item={item}
                            timePeriods={timePeriods}
                            onChartOpen={onChartOpen}
                            onRemoveItem={onRemoveItem}
                            renderTrend={renderTrend}
                            timeframeToChangeKey={timeframeToChangeKey}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BenchmarkTable;